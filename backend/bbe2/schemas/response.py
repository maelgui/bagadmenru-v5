from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from bbe2.schemas.event import Event


class ResponseBase(BaseModel):
    value: bool


class ResponseCreate(ResponseBase):
    pass


class Response(ResponseBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    event_id: int
    # None for responses imported from the previous site (answer date unknown).
    date: Optional[datetime]


class ResponseChangeUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str


class ResponseChange(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_value: Optional[bool]
    to_value: bool
    changed_at: datetime
    event: Event
    user: ResponseChangeUser
