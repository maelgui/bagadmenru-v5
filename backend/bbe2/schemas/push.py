"""Push notification schemas."""

import hashlib
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, model_validator

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

    ``from_attributes`` lets a ``PushSubscriptionDB`` row be validated (or
    returned) directly; the validator below derives ``device_hash`` from the
    row's endpoint and drops the endpoint so it is never serialized.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    device_hash: str
    user_agent: Optional[str] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _derive_device_hash(cls, data: Any) -> Any:
        # Only act when fed a raw source that carries an ``endpoint`` (an ORM
        # row or a mapping); if ``device_hash`` is already provided, leave it.
        endpoint = (
            getattr(data, "endpoint", None)
            if not isinstance(data, dict)
            else data.get("endpoint")
        )
        if endpoint is None:
            return data
        values = {
            "id": _read(data, "id"),
            "device_hash": device_hash(endpoint),
            "user_agent": _read(data, "user_agent"),
            "last_used_at": _read(data, "last_used_at"),
            "created_at": _read(data, "created_at"),
        }
        return values


def _read(data: Any, key: str) -> Any:
    """Read ``key`` from an ORM object or a mapping."""
    return data.get(key) if isinstance(data, dict) else getattr(data, key, None)


class VapidPublicKeyResponse(BaseModel):
    """Schema for VAPID public key response."""

    public_key: str
