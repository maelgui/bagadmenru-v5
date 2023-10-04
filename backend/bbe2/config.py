from typing import Any, Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str

    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_bucket_name: str
    s3_default_region: Optional[str]

    jwt_audience: str = "bbe2"
    jwt_issuer: AnyHttpUrl

    oidc_authorization_url: AnyHttpUrl
    oidc_token_url: AnyHttpUrl
    oidc_jwks_url: AnyHttpUrl

    swagger_client_id: str | None = "bbe2-swagger"

    cors_allowed_origins: list[str] = []

    class Config:
        env_file = ".env"


settings = Settings()
