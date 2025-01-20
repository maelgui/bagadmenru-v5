import hashlib
import logging
import os
from datetime import datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bbe2.config import get_settings
from bbe2.database import session_ctx
from bbe2.models import GroupDB

scheduler = AsyncIOScheduler()


def get_logger():
    stage: str = os.environ.get("STAGE", "unknown")

    logger = logging.getLogger(__name__)

    log_level = logging.INFO

    if stage != "prod":
        log_level = logging.DEBUG

    logger.setLevel(level=log_level)

    return logger


logger = get_logger()

DRY_RUN = True
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
        await self.client.aclose()

    async def retrieve_subscriber(self, domain, name) -> list[str]:
        r = await self.client.get(
            f"/email/domain/{domain}/mailingList/{name}/subscriber"
        )
        r.raise_for_status()

        return r.json()

    async def add_subscriber(self, domain, name, email):
        r = await self.client.post(
            f"/email/domain/{domain}/mailingList/{name}/subscriber",
            json={"email": email},
        )
        r.raise_for_status()

        return r.json()

    async def delete_subscriber(self, domain, name, email):
        r = await self.client.delete(
            f"/email/domain/{domain}/mailingList/{name}/subscriber/{email}"
        )
        r.raise_for_status()

        return r.json()


@scheduler.scheduled_job("cron", hour="*", minute="*")
async def synchronize_mailing_lists():

    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        logger.info("Retriveing groups")
        query = select(GroupDB).where(GroupDB.mailing_list.is_not(None))
        groups = ses.scalars(query)
        for group in groups:
            logger.info(f"Processing group {group.id}#{group.name}")
            await sync_mailing_list(
                group.mailing_list, DOMAIN, set(m.email for m in group.members)
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
        logger.info(f"Updating {name}@{domain}")
        subscribers = set(await helper.retrieve_subscriber(domain=domain, name=name))

        logger.info(f"There is currently {len(subscribers)} subscribers")

        email_to_add = email_list.difference(subscribers)
        email_to_delete = subscribers.difference(email_list)

        if not email_to_add and not email_to_delete:
            logger.info("Mailing list in sync")
            return

        logger.info(f"Must add {len(email_to_add)} and remove {email_to_delete}")

        if DRY_RUN:
            logger.info("Dry run, not updating mailing list")
            return

        for email in email_to_add:
            await helper.add_subscriber(domain=domain, name=name, email=email)
        for email in email_to_delete:
            await helper.delete_subscriber(domain=domain, name=name, email=email)

    logger.info(f"sync successful")
