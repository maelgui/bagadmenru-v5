"""S3 file storage utils functions."""

from typing import BinaryIO, Optional
from urllib.parse import urlencode

import boto3
from botocore.client import Config

from bbe2.config import Settings


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
        self, file_obj: BinaryIO, object_name: str, content_type: Optional[str] = None
    ):
        """Upload a file to an S3 bucket

        :param file_name: File to upload
        :param object_name: S3 object name. If not specified then file_name is used
        :return: True if file was uploaded, else False
        """
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        response = self.client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=self.bucket_name,
            Key=object_name,
            ExtraArgs=extra_args,
        )
        return response

    def generate_get_presigned_url(self, object_name, expiration=3600):
        """Generate a presigned URL to share an S3 object

        :param bucket_name: string
        :param object_name: string
        :param expiration: Time in seconds for the presigned URL to remain valid
        :return: Presigned URL as string. If error, returns None.
        """

        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": object_name},
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
