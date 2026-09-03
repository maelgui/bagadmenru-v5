"""S3 file storage utils functions."""

import contextlib
from datetime import datetime, timezone
from typing import BinaryIO, Iterator, Optional
from urllib.parse import urlencode

import boto3
import botocore.auth
from botocore.client import Config

from bbe2.config import Settings

# Cache-Control for immutable, per-user private assets. Objects are keyed by a
# random UUID and are never replaced at the same key (a new upload gets a new
# key), so the user's own browser may cache them for a year and skip
# revalidation entirely. "private" keeps shared/CDN caches from storing them,
# since these objects are served behind authorization via presigned URLs.
ONE_YEAR_IMMUTABLE_CACHE_CONTROL = "private, max-age=31536000, immutable"

# Hard upper bound the SigV4 presigner allows for X-Amz-Expires. AWS and
# Scaleway reject any presigned GET whose expiry is >= one week with
# "X-Amz-Expires must be less than 604800 seconds". The value is *exclusive*, so
# we stay strictly below it.
MAX_PRESIGNED_URL_EXPIRATION_SECONDS = 7 * 24 * 60 * 60 - 1  # just under 1 week

# Presigned-GET expiration (seconds) for immutable private assets. These are
# also the validity windows for stable URLs: a stable URL is signed at the start
# of a window of ``expiration / 2`` seconds and is valid for the full
# ``expiration``, so a URL minted at the tail of one window is still usable
# through the next window (see ``_stable_window_seconds`` and
# ``generate_get_presigned_url``). Longer expiration => the browser reuses the
# same cached URL for longer. Both are capped below the one-week SigV4 limit.
AVATAR_URL_EXPIRATION_SECONDS = 6 * 24 * 60 * 60  # 6 days
FILE_URL_EXPIRATION_SECONDS = 6 * 24 * 60 * 60  # 6 days


def _stable_window_seconds(expiration: int) -> int:
    """Window over which a stable presigned URL stays byte-identical.

    Derived from the expiration: the URL is signed at the window start and must
    remain valid until a fresh one is issued in the *next* window, so the
    validity (``expiration``) must cover two windows. Inverting that gives a
    window of half the expiration.
    """
    return max(1, expiration // 2)


@contextlib.contextmanager
def _frozen_signing_time(window_seconds: int) -> Iterator[None]:
    """Pin botocore's SigV4 signing clock to the start of the current window.

    botocore stamps ``X-Amz-Date`` with ``datetime.datetime.utcnow()`` where the
    ``datetime`` module is looked up as ``botocore.auth.datetime``. Snapping that
    value to a fixed window makes the resulting presigned URL identical for every
    call within the window, so the browser can cache the object under a stable
    URL. We swap in a shim module whose ``datetime`` class returns the snapped
    time from ``utcnow()`` and otherwise defers to the real class.
    """
    now = datetime.now(timezone.utc)
    epoch = int(now.timestamp())
    snapped = epoch - (epoch % window_seconds)

    real_module = botocore.auth.datetime  # type: ignore[attr-defined]
    real_datetime_cls = real_module.datetime

    class _FrozenDatetime(real_datetime_cls):  # type: ignore[misc, valid-type]
        @classmethod
        def utcnow(cls):
            # botocore formats this with strftime and no tz handling, so it must
            # be a naive UTC datetime (matching the real utcnow's contract).
            return real_datetime_cls.fromtimestamp(snapped, timezone.utc).replace(
                tzinfo=None
            )

    class _FrozenModule:
        datetime = _FrozenDatetime

        def __getattr__(self, name):
            return getattr(real_module, name)

    botocore.auth.datetime = _FrozenModule()  # type: ignore[attr-defined]
    try:
        yield
    finally:
        botocore.auth.datetime = real_module  # type: ignore[attr-defined]


class S3Helper:
    """Regroup S3 utilility functions."""

    def __init__(self, settings: Settings):
        self.client = boto3.client(
            service_name="s3",
            endpoint_url=str(settings.s3_endpoint),
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(
                signature_version="s3v4", region_name=settings.s3_default_region
            ),
        )
        self.bucket_name = settings.s3_bucket_name

    def check(self):
        self.client.head_bucket(Bucket=self.bucket_name)

    def upload_file(
        self,
        file_obj: BinaryIO,
        object_name: str,
        content_type: Optional[str] = None,
        tags: Optional[dict[str, str | int]] = None,
        cache_control: Optional[str] = None,
    ):
        """Upload a file to an S3 bucket

        :param file_name: File to upload
        :param object_name: S3 object name. If not specified then file_name is used
        :param cache_control: Value stored as the object's ``Cache-Control``
            metadata and returned on every GET.
        :return: True if file was uploaded, else False
        """
        extra_args = {}

        if tags:
            extra_args["Tagging"] = urlencode(tags)
        if content_type:
            extra_args["ContentType"] = content_type
        if cache_control:
            extra_args["CacheControl"] = cache_control

        response = self.client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=self.bucket_name,
            Key=object_name,
            ExtraArgs=extra_args,
        )

        return response

    def generate_get_presigned_url(
        self,
        object_name,
        expiration=3600,
        filename: Optional[str] = None,
        disposition: str = "inline",
        cache_control: Optional[str] = None,
        stable: bool = False,
    ):
        """Generate a presigned URL to share an S3 object

        :param bucket_name: string
        :param object_name: string
        :param expiration: Time in seconds for the presigned URL to remain valid
        :param filename: If provided, sets the filename in Content-Disposition.
        :param disposition: Content-Disposition type: "inline" (default) so the
                            browser displays the file in place, or "attachment"
                            so the browser downloads it.
        :param cache_control: If provided, overrides the ``Cache-Control`` header
                            S3 returns for this object (via ``ResponseCacheControl``),
                            letting the browser cache the response.
        :param stable: If True, the signing time is snapped to a window of
                            ``expiration / 2`` so repeated calls for the same
                            object return a byte-identical URL. Combined with
                            ``cache_control`` this lets the browser actually
                            reuse its cache across requests. A longer
                            ``expiration`` therefore also means a longer stable
                            window.
        :return: Presigned URL as string. If error, returns None.
        """
        # SigV4 (AWS and Scaleway) rejects presigned URLs whose expiry is a week
        # or more, so never sign one past the limit.
        expiration = min(expiration, MAX_PRESIGNED_URL_EXPIRATION_SECONDS)

        params = {"Bucket": self.bucket_name, "Key": object_name}
        if filename:
            params["ResponseContentDisposition"] = (
                f'{disposition}; filename="{filename}"'
            )
        else:
            params["ResponseContentDisposition"] = disposition
        if cache_control:
            params["ResponseCacheControl"] = cache_control

        if stable:
            # Snap signing time to a window of half the expiration, so the URL
            # stays byte-identical within the window and remains valid across the
            # boundary into the next one. The browser can then serve the object
            # from cache without a new request for the whole window.
            window = _stable_window_seconds(expiration)
            with _frozen_signing_time(window):
                return self.client.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=expiration,
                )

        return self.client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expiration,
        )

    def generate_put_presigned_url(
        self, object_name: str, tags: dict[str, str], expiration=3600
    ) -> str:
        """Generate presigned url for `put_object` action

        Args:
            object_name (str): Object Key in S3
            tags (dict[str, str]): TagSet to add to object
            expiration (int, optional): URL expiration in seconds. Defaults to 3600.

        Returns:
            str: Presign `put_object` url
        """
        return self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_name,
                "Tagging": urlencode(tags),
            },
            ExpiresIn=expiration,
        )

    def set_tags(self, object_name: str, tags: dict[str, str]):
        """Set Tags of an object

        Args:
            object_name (str): Object Key in S3
            tags (dict[str, str]): TagSet to add to object
        """
        self.client.put_object_tagging(
            Bucket=self.bucket_name,
            Key=object_name,
            Tagging={"TagSet": [{"Key": k, "Value": v} for k, v in tags.items()]},
        )

    def delete_object(self, object_name: str):
        """Add `to_delete` tag to an S3 object.

        Bucket is expected to have a lifecycle policy on tag `to_delete`.

        Args:
            object_name (str): Object key to delete.
        """
        self.set_tags(object_name, {"to_delete": "true"})
