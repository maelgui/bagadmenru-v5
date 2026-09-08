"""Pydantic schemas for per-member API keys."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    """Request body to mint a new API key for the current member."""

    label: str = Field(min_length=1, max_length=64)
    # Subset of the member's own RBAC permissions ("action:resource") the key
    # may exercise. Must be non-empty: a key that authorizes nothing is useless.
    authorized_permissions: list[str] = Field(min_length=1)


class ApiKey(BaseModel):
    """An API key as listed to its owner (never includes the raw secret)."""

    model_config = ConfigDict(from_attributes=True)

    key_hash: str
    prefix: str
    label: str
    authorized_permissions: list[str]
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class ApiKeyCreated(ApiKey):
    """Returned once, immediately after creation, with the raw secret.

    The ``key`` is shown to the member a single time; only its hash is stored,
    so it can never be retrieved again.
    """

    key: str
