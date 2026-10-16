import time

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bbe2.config import get_settings
from bbe2.database import session_ctx
from bbe2.models import GroupDB
from bbe2.services import membership as membership_service
from bbe2.utils import get_logger
from bbe2.utils.action_token import purge_expired_action_tokens
from bbe2.utils.api_key import revoke_stale_auto_generated_keys

scheduler = AsyncIOScheduler()

logger = get_logger()

DRY_RUN = False
DOMAIN = "bagadmenru.bzh"


OVH_API_BASE_URL = "https://eu.api.ovh.com/v1"
OVH_OAUTH2_TOKEN_URL = "https://www.ovh.com/auth/oauth2/token"


class OvhOAuth2Auth(httpx.Auth):
    def __init__(self, client_id: str, client_secret: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self._access_token: str | None = None
        self._expires_at: float = 0.0

    def _fetch_token(self) -> str:
        resp = httpx.post(
            OVH_OAUTH2_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "scope": "all",
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        self._access_token = payload["access_token"]
        # Refresh 60s early to avoid using a token that expires mid-request.
        self._expires_at = time.monotonic() + int(payload["expires_in"]) - 60
        return self._access_token

    def auth_flow(self, request):
        if self._access_token is None or time.monotonic() >= self._expires_at:
            self._fetch_token()
        request.headers["Authorization"] = f"Bearer {self._access_token}"
        yield request


class OvhHelper:
    def __init__(self, client_id: str, client_secret: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self.client = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient()
        self.client.auth = OvhOAuth2Auth(
            client_id=self._client_id,
            client_secret=self._client_secret,
        )
        self.client.base_url = OVH_API_BASE_URL
        self.client.headers["Content-Type"] = "application/json"
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.client:
            await self.client.aclose()

    async def retrieve_subscriber(self, domain, name) -> list[str]:
        if not self.client:
            raise RuntimeError("Client not initialized")
        r = await self.client.get(
            f"/email/domain/{domain}/mailingList/{name}/subscriber"
        )
        r.raise_for_status()

        return r.json()

    async def add_subscriber(self, domain, name, email):
        if not self.client:
            raise RuntimeError("Client not initialized")
        r = await self.client.post(
            f"/email/domain/{domain}/mailingList/{name}/subscriber",
            json={"email": email},
        )
        r.raise_for_status()

        return r.json()

    async def delete_subscriber(self, domain, name, email):
        if not self.client:
            raise RuntimeError("Client not initialized")
        r = await self.client.delete(
            f"/email/domain/{domain}/mailingList/{name}/subscriber/{email}"
        )
        r.raise_for_status()

        return r.json()


@scheduler.scheduled_job("cron", hour="3")
async def synchronize_mailing_lists():

    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        logger.info("Retriveing groups")
        query = select(GroupDB).where(GroupDB.mailing_list.is_not(None))
        groups = ses.scalars(query)
        for group in groups:
            logger.info("Processing group %s#%s", group.id, group.name)
            await sync_mailing_list(
                group.mailing_list,
                DOMAIN,
                set(
                    m.email for m in group.members if m.receives_emails and m.is_active
                ),
            )


async def sync_mailing_list(name, domain, email_list: set[str]):
    settings = get_settings()

    if not settings.ovh_client_id or not settings.ovh_client_secret:
        logger.info("Ovh settings not set, skipping mailing list update")
        return

    async with OvhHelper(
        client_id=settings.ovh_client_id,
        client_secret=settings.ovh_client_secret,
    ) as helper:
        logger.info("Updating %s@%s", name, domain)
        subscribers = set(await helper.retrieve_subscriber(domain=domain, name=name))

        logger.info("There is currently %s subscribers", len(subscribers))

        email_to_add = email_list.difference(subscribers)
        email_to_delete = subscribers.difference(email_list)

        if not email_to_add and not email_to_delete:
            logger.info("Mailing list in sync")
            return

        logger.info(
            "Must add %s and remove %s",
            len(email_to_add),
            len(email_to_delete),
        )

        if DRY_RUN:
            logger.info("Dry run, not updating mailing list")
            return

        for email in email_to_add:
            await helper.add_subscriber(domain=domain, name=name, email=email)
        for email in email_to_delete:
            await helper.delete_subscriber(domain=domain, name=name, email=email)

    logger.info("sync successful")


@scheduler.scheduled_job("cron", hour="4")
async def daily_cleanup():
    """Daily database cleanup, run at 04:00 (after the 03:00 mailing sync).

    - Deletes stale unlinked HelloAsso memberships (orders we could not attach
      to a member) older than ``unlinked_membership_ttl_days``.
    - Deletes dead action tokens (expired / consumed / revoked) past the
      ``action_token_ttl_days`` grace period.
    - Revokes auto-generated API keys that were never used (minted by the
      calendar-sync dialog but never subscribed) older than
      ``stale_auto_api_key_ttl_hours``.
    """
    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        memberships = membership_service.purge_unlinked_memberships(
            ses, ttl_days=settings.unlinked_membership_ttl_days
        )
        logger.info("Unlinked membership purge complete: %d deleted", memberships)

        tokens = purge_expired_action_tokens(
            ses, grace_days=settings.action_token_ttl_days
        )
        logger.info("Action token purge complete: %d deleted", tokens)

        keys = revoke_stale_auto_generated_keys(
            ses, ttl_hours=settings.stale_auto_api_key_ttl_hours
        )
        logger.info("Stale auto-generated API key sweep complete: %d revoked", keys)
