from datetime import date

from pydantic import BaseModel

from bbe2.schemas.event import Event
from bbe2.schemas.profile import Profile


class ResponseBase(BaseModel):
    value: bool

class ResponseCreate(ResponseBase):
    pass

class Response(ResponseBase):
    user: Profile
    event: Event
    date: date

    id: int

    class Config:
        orm_mode = True
