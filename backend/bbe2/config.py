from typing import Any

from pydantic import AnyHttpUrl, BaseSettings


class Settings(BaseSettings):
    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_addressing_style: str = "path"
    s3_bucket_name: str

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
