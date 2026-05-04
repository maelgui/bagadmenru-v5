"""Push notification endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
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


@router.post(
    "/subscribe",
    response_model=schemas.PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    subscription: schemas.PushSubscriptionCreate,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
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
        session.commit()
        return schemas.PushSubscriptionResponse(
            id=existing.id, endpoint=existing.endpoint
        )

    db_subscription = models.PushSubscriptionDB(
        user_id=identifier,
        endpoint=subscription.endpoint,
        p256dh=subscription.p256dh,
        auth=subscription.auth,
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
    )
    return {"status": "sent"}


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
