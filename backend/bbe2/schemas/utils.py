from datetime import timedelta

from pydantic import BaseModel


class GetUploadUrlResponse(BaseModel):
    url: str
    key: str


class MyStats(BaseModel):
    n_responses: int
    n_positive_responses: int
    avg_response_time: timedelta
    responses_needed: int
