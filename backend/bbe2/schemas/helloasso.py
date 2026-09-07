"""HelloAsso membership schemas."""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class MembershipStatus(str, Enum):
    """Computed membership status for the current season."""

    # A processed membership exists for the current season.
    ACTIVE = "active"
    # The member had a membership in a past season but not the current one.
    EXPIRED = "expired"
    # No membership was ever recorded for this member.
    NONE = "none"


class MembershipHistoryItem(BaseModel):
    """One membership record, as ingested from HelloAsso."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    tier_description: Optional[str]
    amount: int
    order_date: datetime
    state: str
    # The season label the order falls into, e.g. "2025-2026".
    season: str


class MembershipInfo(BaseModel):
    """Membership status plus history for a member."""

    status: MembershipStatus
    # The season label the status was computed against, e.g. "2025-2026".
    current_season: str
    # Season label of the most recent active membership, if any.
    active_season: Optional[str] = None
    history: List[MembershipHistoryItem]


# --- Admin manual linking ---------------------------------------------------


class UnlinkedMembership(BaseModel):
    """A membership row not yet attached to a member."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    helloasso_order_id: int
    helloasso_item_id: int
    payer_email: Optional[str]
    payer_first_name: Optional[str]
    payer_last_name: Optional[str]
    tier_description: Optional[str]
    amount: int
    order_date: datetime
    state: str


class MembershipLinkRequest(BaseModel):
    """Request body to link an unlinked membership to a member."""

    user_id: str


# --- HelloAsso webhook payload ----------------------------------------------
#
# Modeled loosely: HelloAsso may add fields and we must not 400 on unknown
# ones (that would make HelloAsso retry a well-formed notification forever).
# We only pin down what we consume. HelloAsso sends camelCase keys, so each
# field declares an alias and the models accept both alias and field name.


class HelloAssoPayer(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    email: Optional[str] = None
    first_name: Optional[str] = Field(default=None, alias="firstName")
    last_name: Optional[str] = Field(default=None, alias="lastName")


class HelloAssoItem(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[int] = None
    state: Optional[str] = None
    tier_description: Optional[str] = Field(default=None, alias="tierDescription")


class HelloAssoOrderData(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    id: Optional[int] = None
    date: Optional[datetime] = None
    payer: Optional[HelloAssoPayer] = None
    items: List[HelloAssoItem] = []


class HelloAssoNotification(BaseModel):
    """Top-level HelloAsso webhook notification envelope."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    event_type: str = Field(alias="eventType")
    data: Optional[HelloAssoOrderData] = None
