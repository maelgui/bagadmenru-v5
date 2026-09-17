"""Push notification schemas."""

import hashlib
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

# Length of the endpoint fingerprint returned to the client. 16 hex chars
# (64 bits) is ample to distinguish a single user's handful of devices while
# staying non-reversible; the browser computes the same value over its own
# endpoint to recognise "this device".
_DEVICE_HASH_LEN = 16


def device_hash(endpoint: str) -> str:
    """Stable, non-reversible fingerprint of a push endpoint.

    The browser hashes its own endpoint the same way to recognise which device
    row is "this device", so the raw endpoint never has to be exposed.
    """
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()[:_DEVICE_HASH_LEN]


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

    # from_attributes lets a PushSubscriptionDB row be validated (or returned)
    # directly.
    model_config = ConfigDict(from_attributes=True)

    id: str
    # Read from the ORM row to feed device_hash, but excluded from output so
    # the raw endpoint is never serialized.
    endpoint: str = Field(exclude=True)
    user_agent: Optional[str] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def device_hash(self) -> str:
        """Server-computed fingerprint of the endpoint (never the endpoint)."""
        return device_hash(self.endpoint)


class VapidPublicKeyResponse(BaseModel):
    """Schema for VAPID public key response."""

    public_key: str
