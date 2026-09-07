"""Push notification service using Web Push (VAPID)."""

import json
import logging
from typing import Optional

from pywebpush import WebPushException, webpush  # type: ignore
from sqlalchemy import select
from sqlalchemy.orm import Session

from bbe2.config import Settings
from bbe2.models.push_subscription import PushSubscriptionDB
from bbe2.services.events import count_unanswered_events

logger = logging.getLogger(__name__)


def send_push_to_user(
    session: Session,
    settings: Settings,
    user_id: str,
    title: str,
    body: str,
    url: Optional[str] = None,
) -> None:
    """Send push notification to all devices of a specific user."""
    subscriptions = session.scalars(
        select(PushSubscriptionDB).where(PushSubscriptionDB.user_id == user_id)
    ).all()

    for sub in subscriptions:
        _send_push(session, settings, sub, title, body, url)


def send_push_to_users(
    session: Session,
    settings: Settings,
    user_ids: list[str],
    title: str,
    body: str,
    url: Optional[str] = None,
) -> None:
    """Send push notification to all devices of multiple users."""
    subscriptions = session.scalars(
        select(PushSubscriptionDB).where(PushSubscriptionDB.user_id.in_(user_ids))
    ).all()

    for sub in subscriptions:
        _send_push(session, settings, sub, title, body, url)


def _send_push(
    session: Session,
    settings: Settings,
    subscription: PushSubscriptionDB,
    title: str,
    body: str,
    url: Optional[str] = None,
) -> None:
    """Send a single push notification."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("VAPID keys not configured, skipping push notification")
        return

    # Recipient-specific count so the service worker can update the installed
    # PWA icon badge even while the app is closed.
    badge_count = count_unanswered_events(session, subscription.user_id)

    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "url": url,
            "badgeCount": badge_count,
        }
    )

    subscription_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        },
    }

    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_claims_email},
        )
    except WebPushException as ex:
        logger.error("Push notification failed: %s", ex)
        # If subscription is expired or invalid (410 Gone or 404), remove it
        if ex.response and ex.response.status_code in (404, 410):
            logger.info(
                "Removing expired subscription %s for user %s",
                subscription.id,
                subscription.user_id,
            )
            session.delete(subscription)
            session.commit()
