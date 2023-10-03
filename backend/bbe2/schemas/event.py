from datetime import date
from enum import Enum

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


class EventCreate(_EventBase):
    pass


class Event(_EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
