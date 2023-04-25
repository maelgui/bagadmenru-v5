from datetime import date
from enum import Enum

from pydantic import BaseModel


class Costume(Enum):
    POLO = 'POLO'
    COSTUME = 'COSTUME'
    NONE = 'NONE'

class _EventBase(BaseModel):
    title: str
    description: str
    date: date
    costume: Costume

class EventCreate(_EventBase):
    pass

class Event(_EventBase):
    id: int

    class Config:
        orm_mode = True
