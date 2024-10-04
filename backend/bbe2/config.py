from functools import lru_cache
from typing import Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str

    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_bucket_name: str
    s3_default_region: Optional[str] = None

    swagger_client_id: str | None = "bbe2-swagger"

    cors_allowed_origins: list[str] = []
    cors_allowed_origin_regex: Optional[str] = None

    secret_key: str

    domain: str = "beta.bagadmenru.bzh"


@lru_cache
def get_settings() -> Settings:
    return Settings()
