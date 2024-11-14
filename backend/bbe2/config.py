from functools import lru_cache
from typing import Optional

from pydantic import AnyHttpUrl, field_validator
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

    domain: str = "beta.bagadmenru.bzh"

    oidc_issuer: str
    oidc_audience: str
    user_api_endpoint: str
    email_api_endpoint: str

    token_secret_key: str
    token_max_age: int = 60 * 60 * 24 * 7  # 7 days

    @field_validator("user_api_endpoint", "email_api_endpoint")
    @classmethod
    def name_must_contain_space(cls, v: str) -> str:
        return v.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore
