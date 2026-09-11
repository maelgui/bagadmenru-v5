"""Push notification schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a push subscription."""

    endpoint: str
    p256dh: str
    auth: str


class PushSubscriptionResponse(BaseModel):
    """Schema for push subscription response."""

    id: str
    endpoint: str


class PushDevice(BaseModel):
    """A push-subscribed device belonging to the current user.

    Never exposes the encryption keys (p256dh/auth) nor the raw endpoint URL.
    The raw user_agent is returned so the frontend can render a friendly label;
    last_used_at is the time of the last successfully sent push (null if none
    sent yet). device_hash is a stable, non-reversible fingerprint of the push
    endpoint: the browser hashes its own endpoint the same way to recognise
    which row is "this device" without the endpoint ever being exposed.
    """

    id: str
    device_hash: str
    user_agent: Optional[str] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime


class VapidPublicKeyResponse(BaseModel):
    """Schema for VAPID public key response."""

    public_key: str
