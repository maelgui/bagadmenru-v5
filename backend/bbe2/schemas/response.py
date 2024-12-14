from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResponseBase(BaseModel):
    value: bool


class ResponseCreate(ResponseBase):
    pass


class Response(ResponseBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    event_id: int
    date: datetime
