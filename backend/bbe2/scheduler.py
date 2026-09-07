import hashlib
from datetime import datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bbe2.config import get_settings
from bbe2.database import session_ctx
from bbe2.models import GroupDB
from bbe2.services import membership as membership_service
from bbe2.utils import get_logger

scheduler = AsyncIOScheduler()

logger = get_logger()

DRY_RUN = False
DOMAIN = "bagadmenru.bzh"


class OvhApiAuth(httpx.Auth):
    def __init__(
        self, application_key: str, application_secret: str, consumer_key: str
    ):
        self._application_key = application_key
        self._application_secret = application_secret
        self._consumer_key = consumer_key

    def auth_flow(self, request):
        timestamp = str(int(datetime.now().timestamp()))
        signature = hashlib.sha1()
        signature.update(
            "+".join(
                [
                    self._application_secret,
                    self._consumer_key,
                    request.method.upper(),
                    str(request.url),
                    request.content.decode("utf-8"),
                    timestamp,
                ]
            ).encode("utf-8")
        )

        request.headers["X-Ovh-Consumer"] = self._consumer_key
        request.headers["X-Ovh-Timestamp"] = timestamp
        request.headers["X-Ovh-Signature"] = "$1$" + signature.hexdigest()
        request.headers["X-Ovh-Application"] = self._application_key

        yield request


class OvhHelper:
    def __init__(
        self, application_key: str, application_secret: str, consumer_key: str
    ):
        self._application_key = application_key
        self._application_secret = application_secret
        self._consumer_key = consumer_key
        self.client = None

    async def __aenter__(self):
        self.client = httpx.AsyncClient()
        self.client.auth = OvhApiAuth(
            application_key=self._application_key,
            application_secret=self._application_secret,
            consumer_key=self._consumer_key,
        )
        self.client.base_url = "https://eu.api.ovh.com/v1"
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

    if (
        not settings.ovh_application_key
        or not settings.ovh_application_secret
        or not settings.ovh_consumer_key
    ):
        logger.info("Ovh settings not set, skipping mailing list update")
        return

    async with OvhHelper(
        application_key=settings.ovh_application_key,
        application_secret=settings.ovh_application_secret,
        consumer_key=settings.ovh_consumer_key,
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
async def purge_unlinked_memberships():
    """Daily cleanup of stale unlinked HelloAsso memberships.

    Deletes unlinked orders (``user_id IS NULL``) older than the configured
    reconciliation window (``unlinked_membership_ttl_days``). Runs at 04:00,
    after the 03:00 mailing-list sync.
    """
    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        deleted = membership_service.purge_unlinked_memberships(
            ses, ttl_days=settings.unlinked_membership_ttl_days
        )
        logger.info("Unlinked membership purge complete: %d deleted", deleted)
