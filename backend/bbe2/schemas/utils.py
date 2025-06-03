from datetime import timedelta

from pydantic import BaseModel

from bbe2.schemas.profile import Profile


class GetUploadUrlResponse(BaseModel):
    url: str
    key: str


class MyStats(BaseModel):
    n_responses: int
    n_positive_responses: int | None
    avg_response_time: timedelta | None
    n_upcomming_responses: int


class GlobalStats(BaseModel):
    n_responses: int
    n_events: int
    avg_response_time: timedelta | None
    n_upcoming_event: int


class RankingInfo(BaseModel):
    n_responses: int
    n_positive_responses: int
    avg_response_time: timedelta | None
    n_responses_rank: int
    n_positive_responses_rank: int
    avg_response_time_rank: int | None


class UserRankingItem(BaseModel):
    user: Profile
    ranks: RankingInfo


class UserRankings(BaseModel):
    rankings: list[UserRankingItem]
