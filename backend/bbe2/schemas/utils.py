from datetime import timedelta

from pydantic import BaseModel


class GetUploadUrlResponse(BaseModel):
    url: str
    key: str


class MyStats(BaseModel):
    n_responses: int
    n_positive_responses: int | None
    avg_response_time: timedelta | None


class GlobalStats(BaseModel):
    n_responses: int
    n_events: int
    avg_response_time: timedelta | None
