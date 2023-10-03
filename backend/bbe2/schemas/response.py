from datetime import date

from pydantic import BaseModel, ConfigDict

from bbe2.schemas.event import Event
from bbe2.schemas.profile import Profile


class ResponseBase(BaseModel):
    value: bool


class ResponseCreate(ResponseBase):
    pass


class Response(ResponseBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    event_id: int
    date: date
