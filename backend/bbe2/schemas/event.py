from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Costume(Enum):
    POLO = "POLO"
    COSTUME = "COSTUME"
    NONE = "NONE"


class _EventBase(BaseModel):
    title: str
    description: str
    date: date
    costume: Costume
    category: str
    is_in_doodle: bool


class EventCreate(_EventBase):
    campaign_id: Optional[int] = None


class Event(_EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: Optional[int] = None
