"""Pydantic schemas for the administration area (admin-only endpoints)."""

from typing import Optional

from pydantic import BaseModel

from bbe2.schemas.api_key import ApiKey
from bbe2.schemas.helloasso import MembershipStatus
from bbe2.schemas.profile import MinimalGroup


class RoleDetail(BaseModel):
    id: str
    description: Optional[str] = None
    # Effective permissions as "action:resource" strings, from the in-code
    # ROLE_PERMISSIONS matrix (roles are not editable in the database).
    permissions: list[str]
    groups: list[MinimalGroup]
    member_count: int


class AdminMember(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    is_active: bool
    receives_emails: bool
    has_password: bool
    passkey_count: int
    push_subscription_count: int
    api_key_count: int
    membership_status: MembershipStatus
    membership_active_season: Optional[str] = None
    instrument: Optional[MinimalGroup] = None
    groups: list[MinimalGroup]


class ApiKeyOwner(BaseModel):
    id: str
    first_name: str
    last_name: str


class AdminApiKey(ApiKey):
    owner: ApiKeyOwner


class AdminOverview(BaseModel):
    members_total: int
    members_active: int
    members_inactive: int
    members_with_passkey: int
    members_with_password: int
    members_without_credential: int
    groups: int
    roles: int
    api_keys_active: int
    push_subscriptions: int
    members_with_push: int
    memberships_active_season: int
    unlinked_memberships: int
    events: int
    files: int


class IntegrationStatus(BaseModel):
    key: str
    label: str
    configured: bool
    detail: Optional[str] = None


class SystemStatus(BaseModel):
    environment: str
    version: str
    integrations: list[IntegrationStatus]
