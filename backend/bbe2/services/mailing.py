import time
from dataclasses import dataclass, field

import httpx

from bbe2.config import Settings
from bbe2.utils import get_logger

logger = get_logger()

DOMAIN = "bagadmenru.bzh"
OVH_API_BASE_URL = "https://eu.api.ovh.com/v1"
OVH_OAUTH2_TOKEN_URL = "https://www.ovh.com/auth/oauth2/token"


@dataclass
class MailingListDiff:
    configured: bool
    subscribers: list[str] = field(default_factory=list)
    expected: list[str] = field(default_factory=list)
    to_add: list[str] = field(default_factory=list)
    to_remove: list[str] = field(default_factory=list)

    @property
    def in_sync(self) -> bool:
        return not self.to_add and not self.to_remove


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


def ovh_configured(settings: Settings) -> bool:
    return bool(settings.ovh_client_id and settings.ovh_client_secret)


def _helper(settings: Settings) -> OvhHelper:
    assert settings.ovh_client_id is not None
    assert settings.ovh_client_secret is not None
    return OvhHelper(
        client_id=settings.ovh_client_id,
        client_secret=settings.ovh_client_secret,
    )


async def compute_diff(
    settings: Settings, name: str, domain: str, email_list: set[str]
) -> MailingListDiff:
    if not ovh_configured(settings):
        return MailingListDiff(configured=False, expected=sorted(email_list))

    async with _helper(settings) as helper:
        subscribers = set(await helper.retrieve_subscriber(domain=domain, name=name))

    return MailingListDiff(
        configured=True,
        subscribers=sorted(subscribers),
        expected=sorted(email_list),
        to_add=sorted(email_list.difference(subscribers)),
        to_remove=sorted(subscribers.difference(email_list)),
    )


async def sync_mailing_list(
    settings: Settings, name: str, domain: str, email_list: set[str]
) -> MailingListDiff:
    if not ovh_configured(settings):
        logger.info("Ovh settings not set, skipping mailing list update")
        return MailingListDiff(configured=False, expected=sorted(email_list))

    async with _helper(settings) as helper:
        logger.info("Updating %s@%s", name, domain)
        subscribers = set(await helper.retrieve_subscriber(domain=domain, name=name))
        logger.info("There is currently %s subscribers", len(subscribers))

        to_add = email_list.difference(subscribers)
        to_remove = subscribers.difference(email_list)

        if to_add or to_remove:
            logger.info("Must add %s and remove %s", len(to_add), len(to_remove))
            for email in to_add:
                await helper.add_subscriber(domain=domain, name=name, email=email)
            for email in to_remove:
                await helper.delete_subscriber(domain=domain, name=name, email=email)
        else:
            logger.info("Mailing list in sync")

    logger.info("sync successful")
    return MailingListDiff(
        configured=True,
        subscribers=sorted(email_list),
        expected=sorted(email_list),
        to_add=[],
        to_remove=[],
    )
