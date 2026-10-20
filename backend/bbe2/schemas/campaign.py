from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from bbe2.schemas.profile import MinimalGroup


class CampaignCreate(BaseModel):
    name: str = Field(max_length=150)
    description: Optional[str] = None
    group_id: int


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    group_id: Optional[int] = None


class CampaignEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: date
    category: str


class CampaignListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    status: str
    group_id: int
    group: MinimalGroup
    created_at: datetime
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
