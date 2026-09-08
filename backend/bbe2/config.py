import os
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
    # Fail safe: an unset ENVIRONMENT must degrade to the most secure posture
    # (Secure cookies, etc.), so the default is PRODUCTION. Local development
    # opts in explicitly via ENVIRONMENT=development (see docker-compose.yml).
    environment: Environment = Environment.PRODUCTION
    database_url: str

    s3_endpoint: AnyHttpUrl
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_bucket_name: str
    s3_default_region: Optional[str] = None

    swagger_client_id: str | None = "bbe2-swagger"

    frontend_base_url: AnyHttpUrl = AnyHttpUrl("https://beta.bagadmenru.bzh")

    jwt_secret_key: str

    # Lifetime of an access token (JWT exp) and the session / active-account
    # cookies that carry it. Defaults to 90 days; override via
    # ACCESS_TOKEN_MAX_AGE_SECONDS.
    access_token_max_age_seconds: int = 90 * 24 * 60 * 60

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

    # HelloAsso webhook authentication.
    #
    # Two independent mechanisms, checked in the webhook handler:
    #
    # 1. ``helloasso_signature_key``: the partner "signatureKey". When set, the
    #    incoming ``x-ha-signature`` header is verified as an HMAC-SHA256 of the
    #    raw request body. Only partners get a signatureKey, so associations
    #    leave this unset.
    # 2. ``helloasso_webhook_token``: a shared secret embedded in the webhook
    #    URL (``?token=...``). This is the fallback for associations, which
    #    configure the notification URL themselves in their HelloAsso account.
    #
    # If neither is configured the webhook rejects every request (fail closed),
    # so a misconfigured deployment cannot accept forged notifications.
    helloasso_signature_key: Optional[str] = None
    helloasso_webhook_token: Optional[str] = None

    # Unlinked HelloAsso memberships (``user_id IS NULL``) are orders we could
    # not attach to a member automatically. Most are noise: the Cercle
    # Montfortais handles memberships for several activities, so we receive
    # orders for people who are not in the bagad. A daily job deletes unlinked
    # rows older than this many days (based on ``received_at``), leaving admins
    # a reconciliation window to attach the genuine ones first. Set to 0 to
    # disable the purge entirely.
    unlinked_membership_ttl_days: int = 30

    # Dead action tokens (expired, consumed, or revoked email-link tokens:
    # password reset, RSVP, unsubscribe, invitation, OTP) are pruned daily. This
    # is a grace period, in days, kept after a token becomes unusable before it
    # is deleted (0 removes it as soon as it is dead). They carry no value once
    # dead; the delay only leaves a short window for debugging/audit.
    action_token_ttl_days: int = 7

    @property
    def cookie_secure(self) -> bool:
        """Whether auth cookies must carry the Secure attribute.

        Disabled in local development so the cookie is stored over plain HTTP
        (http://localhost); Safari, unlike Chrome, refuses to store a Secure
        cookie on an insecure origin. Enabled everywhere else.
        """
        return self.environment not in (
            Environment.DEVELOPMENT,
            Environment.CI,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore


def get_environment() -> Environment:
    """Environment resolved at import time, before the request cycle.

    Bootstrap code such as the Sentry init in ``main.py`` needs the environment
    before FastAPI's dependency injection is available, so it cannot rely on
    ``get_settings()`` (its value is not affected by test ``dependency_overrides``
    and is frozen by ``lru_cache``). This reads ``os.environ`` directly instead.

    Fail safe: an unset or unrecognised ``ENVIRONMENT`` degrades to DEVELOPMENT,
    which keeps error reporting off outside beta/production (tests never set it).
    """
    raw = os.environ.get("ENVIRONMENT", Environment.DEVELOPMENT.value)
    try:
        return Environment(raw)
    except ValueError:
        return Environment.DEVELOPMENT
