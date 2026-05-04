"""Push notification schemas."""

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


class VapidPublicKeyResponse(BaseModel):
    """Schema for VAPID public key response."""

    public_key: str
