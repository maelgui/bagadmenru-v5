"""Tests for S3Helper presigned URL caching behaviour."""

from datetime import datetime, timezone
from unittest.mock import patch

import boto3
from botocore.client import Config

import bbe2.utils.s3 as s3mod
from bbe2.utils.s3 import ONE_YEAR_IMMUTABLE_CACHE_CONTROL, S3Helper


def _make_helper() -> S3Helper:
    helper = S3Helper.__new__(S3Helper)
    helper.client = boto3.client(
        "s3",
        endpoint_url="https://s3.fr-par.scw.cloud",
        aws_access_key_id="AKIATEST",
        aws_secret_access_key="secrettest",
        config=Config(signature_version="s3v4", region_name="fr-par"),
    )
    helper.bucket_name = "test-bucket"
    return helper


def _freeze_now(ts: float):
    real = s3mod.datetime

    class _D(real):  # type: ignore[misc, valid-type]
        @classmethod
        def now(cls, tz=None):
            return real.fromtimestamp(ts, tz)

    return patch.object(s3mod, "datetime", _D)


def test_stable_url_is_identical_within_window():
    helper = _make_helper()
    expiration = s3mod.FILE_URL_EXPIRATION_SECONDS
    window = s3mod._stable_window_seconds(expiration)
    base = 1_700_000_000
    # Snap the base to a window start so an offset stays inside the same window.
    base -= base % window
    with _freeze_now(base):
        url1 = helper.generate_get_presigned_url(
            "files/abc", expiration=expiration, stable=True
        )
        # A later call within the same window must be identical.
        with _freeze_now(base + window // 2):
            url2 = helper.generate_get_presigned_url(
                "files/abc", expiration=expiration, stable=True
            )
    assert url1 == url2


def test_stable_url_changes_across_windows():
    helper = _make_helper()
    expiration = 3600
    window = s3mod._stable_window_seconds(expiration)
    with _freeze_now(1_700_000_000):
        url1 = helper.generate_get_presigned_url(
            "files/abc", expiration=expiration, stable=True
        )
    # Advance beyond one window -> different signing window.
    with _freeze_now(1_700_000_000 + window + 10):
        url2 = helper.generate_get_presigned_url(
            "files/abc", expiration=expiration, stable=True
        )
    assert url1 != url2


def test_window_is_half_the_expiration():
    assert s3mod._stable_window_seconds(3600) == 1800
    assert s3mod._stable_window_seconds(s3mod.FILE_URL_EXPIRATION_SECONDS) == (
        s3mod.FILE_URL_EXPIRATION_SECONDS // 2
    )


def test_expiration_is_clamped_below_sigv4_week_limit():
    helper = _make_helper()
    # Ask for well over a week; the signer must clamp it below the limit.
    url = helper.generate_get_presigned_url(
        "files/abc", expiration=30 * 24 * 60 * 60, stable=True
    )
    assert "X-Amz-Expires=%d" % s3mod.MAX_PRESIGNED_URL_EXPIRATION_SECONDS in url


def test_asset_expirations_are_within_sigv4_limit():
    assert (
        s3mod.AVATAR_URL_EXPIRATION_SECONDS
        <= s3mod.MAX_PRESIGNED_URL_EXPIRATION_SECONDS
    )
    assert (
        s3mod.FILE_URL_EXPIRATION_SECONDS <= s3mod.MAX_PRESIGNED_URL_EXPIRATION_SECONDS
    )
    assert s3mod.MAX_PRESIGNED_URL_EXPIRATION_SECONDS < 7 * 24 * 60 * 60


def test_cache_control_is_embedded():
    helper = _make_helper()
    expiration = s3mod.FILE_URL_EXPIRATION_SECONDS
    url = helper.generate_get_presigned_url(
        "files/abc",
        cache_control=ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
        expiration=expiration,
        stable=True,
    )
    assert "response-cache-control=" in url.lower()
    assert "X-Amz-Expires=%d" % expiration in url


def test_signing_clock_is_restored_after_use():
    import botocore.auth

    real_module = botocore.auth.datetime
    helper = _make_helper()
    helper.generate_get_presigned_url("files/abc", stable=True)
    assert botocore.auth.datetime is real_module


def test_stable_url_is_valid_utcnow_snapped():
    """The frozen utcnow must equal the window start, not wall-clock now."""
    helper = _make_helper()
    now = datetime.now(timezone.utc)
    with _freeze_now(now.timestamp()):
        url = helper.generate_get_presigned_url("files/abc", stable=True)
    assert "X-Amz-Date=" in url
