from enum import Enum
from functools import lru_cache
from typing import Optional

from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    PRODUCTION = "production"
    BETA = "beta"
    DEVELOPMENT = "development"
    CI = "ci"


class Settings(BaseSettings):
    environment: Environment = Environment.DEVELOPMENT
    database_url: str

    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_bucket_name: str
    s3_default_region: Optional[str] = None

    swagger_client_id: str | None = "bbe2-swagger"

    frontend_base_url: AnyHttpUrl = AnyHttpUrl("https://beta.bagadmenru.bzh")

    jwt_secret_key: str

    # Email (SMTP for sending, IMAP for reading inbox)
    smtp_host: str = "ssl0.ovh.net"
    smtp_port: int = 465
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    email_from: str = "Bagad Men Ru <contact@bagadmenru.bzh>"
    email_dry_run: bool = False

    imap_host: str = "ssl0.ovh.net"
    imap_port: int = 993
    imap_username: Optional[str] = None
    imap_password: Optional[str] = None

    token_secret_key: str

    ovh_application_key: Optional[str] = None
    ovh_application_secret: Optional[str] = None
    ovh_consumer_key: Optional[str] = None

    relying_party_id: str = "prod.bagadmenru.bzh"
    relying_party_name: str = "Bagad Men Ru"

    vapid_private_key: Optional[str] = None
    vapid_public_key: Optional[str] = None
    vapid_claims_email: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore
