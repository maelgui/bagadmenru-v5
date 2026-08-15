from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from bbe2.schemas.profile import MinimalGroup


class CampaignCreate(BaseModel):
    """No status field: status is server-enforced to 'draft'.

    Unknown fields (e.g. a client-sent 'status') are ignored by Pydantic.
    """

    name: str = Field(max_length=150)
    description: Optional[str] = None
    group_id: int


class CampaignUpdate(BaseModel):
    """No status field: transitions go through /publish and /archive only."""

    name: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    group_id: Optional[int] = None


class CampaignEvent(BaseModel):
    """Minimal event representation within a campaign response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: date
    category: str


class CampaignListItem(BaseModel):
    """Lightweight campaign representation for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    status: str
    group_id: int
    group: MinimalGroup
    created_at: datetime
    # Derived date range: min/max of linked event dates, None when no events
    first_event_date: Optional[date] = None
    last_event_date: Optional[date] = None


class Campaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    status: str
    group_id: int
    group: MinimalGroup
    created_at: datetime
    events: list[CampaignEvent] = []
    first_event_date: Optional[date] = None
    last_event_date: Optional[date] = None
