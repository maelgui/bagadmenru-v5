from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


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
