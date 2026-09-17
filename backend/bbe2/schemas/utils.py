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
    """A single user's metrics and dense ranks within one ranking window.

    A window is either a single season or the all-time aggregate. Ranks are
    computed in SQL. ``response_rate`` and its rank are ``None`` in the
    all-time window, where a rate across seasons is not meaningful.
    """

    # Reactivity: median delay between an event being published and the user
    # answering it. Lower is better. Null when the user has no timed response.
    median_response_time: timedelta | None
    median_response_time_rank: int | None
    # Assiduity: share (0..1) of the window's answerable events the user
    # responded to. Null in the all-time window.
    response_rate: float | None
    response_rate_rank: int | None
    # Attendance: absolute number of positive responses. Higher is better.
    n_positive_responses: int
    n_positive_responses_rank: int


class UserRankingItem(BaseModel):
    user: Profile
    ranks: RankingInfo


class SeasonRanking(BaseModel):
    """Full ranking for one window.

    ``season`` is the starting year of the season (e.g. ``2024`` for the
    2024-2025 season), or ``None`` for the all-time aggregate across seasons.
    """

    season: int | None
    items: list[UserRankingItem]


class UserRankings(BaseModel):
    # One entry per season (most recent first) plus a trailing all-time entry
    # (``season`` is ``None``).
    seasons: list[SeasonRanking]
