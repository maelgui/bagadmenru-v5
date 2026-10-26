from datetime import date, time
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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
    location: Optional[str] = Field(default=None, max_length=100)
    start_time: Optional[time] = None
    is_public: bool = False
    public_description: Optional[str] = None


class EventCreate(_EventBase):
    pass


class Event(_EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PublicEvent(BaseModel):
    """An event as exposed to the public website.

    Deliberately a projection, not ``Event``: the members-only ``description``,
    ``costume`` and ``is_in_doodle`` never leave the members' area. The public
    text is served under the plain name ``description`` so the consumer does not
    need to know about the internal split.
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    title: str
    date: date
    start_time: Optional[time] = None
    location: Optional[str] = None
    category: str
    description: Optional[str] = Field(
        default=None, validation_alias="public_description"
    )
