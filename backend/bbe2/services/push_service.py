"""Push notification service using Web Push (VAPID)."""

import json
import logging
from typing import Any, Optional

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


def send_push_to_users_with_data(
    session: Session,
    settings: Settings,
    title: str,
    body: str,
    extra_by_user: dict[str, dict[str, Any]],
    url: Optional[str] = None,
) -> None:
    """Send a push to multiple users, with per-user extra payload data.

    ``extra_by_user`` maps a user id to a dict of additional fields merged into
    that user's push payload (e.g. an RSVP quick-answer ``token`` and
    ``eventId`` so the service worker can answer directly from a notification
    action). Only users present in the mapping are notified.
    """
    subscriptions = session.scalars(
        select(PushSubscriptionDB).where(
            PushSubscriptionDB.user_id.in_(extra_by_user.keys())
        )
    ).all()

    for sub in subscriptions:
        _send_push(
            session,
            settings,
            sub,
            title,
            body,
            url,
            extra=extra_by_user.get(sub.user_id),
        )


def _send_push(
    session: Session,
    settings: Settings,
    subscription: PushSubscriptionDB,
    title: str,
    body: str,
    url: Optional[str] = None,
    extra: Optional[dict[str, Any]] = None,
) -> None:
    """Send a single push notification."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("VAPID keys not configured, skipping push notification")
        return

    # Recipient-specific count so the service worker can update the installed
    # PWA icon badge even while the app is closed.
    badge_count = count_unanswered_events(session, subscription.user_id)

    data = {
        "title": title,
        "body": body,
        "url": url,
        "badgeCount": badge_count,
    }
    # Per-user extras (e.g. RSVP quick-answer token + eventId) so the service
    # worker can answer directly from a notification action button. Kept out of
    # the shared fields so callers without per-user data are unaffected.
    if extra:
        data.update(extra)

    payload = json.dumps(data)

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
