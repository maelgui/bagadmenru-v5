"""Push notification endpoints."""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select

from bbe2 import models, schemas
from bbe2.dependencies import SessionDep, SettingsDep
from bbe2.services.push_service import send_push_to_user
from bbe2.utils.auth import get_current_user2

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.get("/vapid-public-key", response_model=schemas.VapidPublicKeyResponse)
async def get_vapid_public_key(settings: SettingsDep):
    """Return the VAPID public key for the frontend to subscribe."""
    if settings.vapid_public_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications are not configured",
        )
    return schemas.VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.get("/subscriptions", response_model=list[schemas.PushDevice])
async def list_subscriptions(
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """List the current user's push-subscribed devices.

    Encryption keys are never returned. Ordered most recently used first,
    falling back to creation time for devices that never received a push.
    """
    subscriptions = session.scalars(
        select(models.PushSubscriptionDB)
        .where(models.PushSubscriptionDB.user_id == identifier)
        .order_by(
            models.PushSubscriptionDB.last_used_at.desc().nullslast(),
            models.PushSubscriptionDB.created_at.desc(),
        )
    ).all()

    # PushDevice derives device_hash from each row's endpoint and drops the
    # endpoint, so returning the ORM rows directly is safe (see schema).
    return subscriptions


@router.post(
    "/subscribe",
    response_model=schemas.PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    subscription: schemas.PushSubscriptionCreate,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
    user_agent: Annotated[Optional[str], Header()] = None,
):
    """Register a push subscription for the current user.

    A user can have multiple subscriptions (one per device/browser).
    Each device/browser generates a unique push endpoint URL.
    If the same endpoint already exists (same browser re-subscribing),
    we update the keys instead of creating a duplicate.
    """
    existing = session.scalars(
        select(models.PushSubscriptionDB).where(
            models.PushSubscriptionDB.endpoint == subscription.endpoint
        )
    ).first()

    if existing:
        existing.p256dh = subscription.p256dh
        existing.auth = subscription.auth
        existing.user_id = identifier
        existing.user_agent = user_agent
        session.commit()
        return schemas.PushSubscriptionResponse(
            id=existing.id, endpoint=existing.endpoint
        )

    db_subscription = models.PushSubscriptionDB(
        user_id=identifier,
        endpoint=subscription.endpoint,
        p256dh=subscription.p256dh,
        auth=subscription.auth,
        user_agent=user_agent,
    )
    session.add(db_subscription)
    session.commit()

    return schemas.PushSubscriptionResponse(
        id=db_subscription.id, endpoint=db_subscription.endpoint
    )


@router.post("/test", status_code=status.HTTP_200_OK)
async def test_push(
    session: SessionDep,
    settings: SettingsDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Send a test push notification to the current user."""
    send_push_to_user(
        session=session,
        settings=settings,
        user_id=identifier,
        title="Test - Bagad Men Ru",
        body="Les notifications push fonctionnent !",
        url="/",
        kind="test",
    )
    return {"status": "sent"}


@router.delete(
    "/subscriptions/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_subscription(
    subscription_id: str,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Revoke one of the current user's devices by id.

    Used from the device list to remove a device other than the current
    browser (which uses /unsubscribe with its own endpoint).
    """
    db_subscription = session.scalars(
        select(models.PushSubscriptionDB).where(
            models.PushSubscriptionDB.id == subscription_id,
            models.PushSubscriptionDB.user_id == identifier,
        )
    ).first()

    if not db_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    session.delete(db_subscription)
    session.commit()


@router.delete("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    subscription: schemas.PushSubscriptionCreate,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Remove a push subscription for the current user."""
    db_subscription = session.scalars(
        select(models.PushSubscriptionDB).where(
            models.PushSubscriptionDB.endpoint == subscription.endpoint,
            models.PushSubscriptionDB.user_id == identifier,
        )
    ).first()

    if not db_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )

    session.delete(db_subscription)
    session.commit()
