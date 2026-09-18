"""Tests for the stats endpoints.

Focus: the "upcoming" cutoff must be midnight today, not the current time, so
the home-page banner (n_upcoming_event - n_upcomming_responses) stays
consistent with the PWA app badge throughout the day. An event scheduled
earlier today must still count as upcoming.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.schemas import Costume

SEEDED_USER_ID = "a8e2d3249e9d997e"
DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def _add_event_earlier_today(event_id: int) -> None:
    """Insert an unanswered doodle event scheduled at 00:01 today."""
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        session.add(
            models.EventDB(
                id=event_id,
                title="Repet du matin",
                description="tot",
                date=datetime.now().replace(hour=0, minute=1, second=0, microsecond=0),
                costume=Costume.NONE,
                category="TEST",
                is_in_doodle=True,
            )
        )
        session.commit()


def test_global_stats_counts_event_earlier_today_as_upcoming(client: TestClient):
    _add_event_earlier_today(event_id=100)

    resp = client.get("/api/v1/stats/")
    assert resp.status_code == 200
    # The event at 00:01 today must be counted as upcoming even later in the day.
    assert resp.json()["n_upcoming_event"] >= 1


def test_my_stats_counts_response_to_event_earlier_today(client: TestClient):
    _add_event_earlier_today(event_id=101)
    # Answer that event so it counts toward n_upcomming_responses.
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        session.add(
            models.ResponseDB(
                value=True,
                date=datetime.now(),
                event_id=101,
                user_id=SEEDED_USER_ID,
            )
        )
        session.commit()

    resp = client.get("/api/v1/stats/me")
    assert resp.status_code == 200
    assert resp.json()["n_upcomming_responses"] >= 1


def test_banner_pending_count_non_negative(client: TestClient):
    """n_upcoming_event - n_upcomming_responses (the banner count) must not go
    negative: both sides use the same midnight cutoff, so a response can never
    outlive its event in the subtraction."""
    _add_event_earlier_today(event_id=102)
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        session.add(
            models.ResponseDB(
                value=False,
                date=datetime.now(),
                event_id=102,
                user_id=SEEDED_USER_ID,
            )
        )
        session.commit()

    global_stats = client.get("/api/v1/stats/").json()
    my_stats = client.get("/api/v1/stats/me").json()
    pending = global_stats["n_upcoming_event"] - my_stats["n_upcomming_responses"]
    assert pending >= 0


def _add_answered_event(event_id: int, event_date: datetime, value: bool) -> None:
    """Insert an event on ``event_date`` answered by the seeded user."""
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        session.add(
            models.EventDB(
                id=event_id,
                title=f"Event {event_id}",
                description="seasonal",
                date=event_date,
                costume=Costume.NONE,
                category="TEST",
                is_in_doodle=True,
            )
        )
        session.flush()
        session.add(
            models.ResponseDB(
                value=value,
                date=event_date,
                event_id=event_id,
                user_id=SEEDED_USER_ID,
            )
        )
        session.commit()


def test_rankings_split_responses_by_season(client: TestClient):
    """A user's responses must be grouped into seasons that run Sept->Aug.

    Events in Oct 2024 and Feb 2025 both belong to season 2024; an event in
    Oct 2025 belongs to season 2025. So the seeded user must expose those two
    distinct seasons with the right response counts.
    """
    # Season 2024: two positive responses (Oct 2024 + Feb 2025).
    _add_answered_event(200, datetime(2024, 10, 15), value=True)
    _add_answered_event(201, datetime(2025, 2, 10), value=True)
    # Season 2025: one positive response (Oct 2025).


def test_rankings_split_responses_by_season(client: TestClient):
    """Responses must be grouped into Sept->Aug seasons, each its own window.

    Events in Oct 2024 and Feb 2025 both belong to season 2024; an event in
    Oct 2025 belongs to season 2025. The endpoint must therefore expose those
    seasons as distinct ranking windows and place the seeded user in them.

    The rankings query relies on PostgreSQL-only features
    (``percentile_cont``, ``GROUPING SETS``), so this behaviour is only
    asserted when running against Postgres; on SQLite it is skipped.
    """
    if not DATABASE_URL.startswith("postgresql"):
        pytest.skip(
            "Rankings query requires PostgreSQL (percentile_cont/grouping sets)"
        )

    # Season 2024: three positive responses so the user is eligible.
    _add_answered_event(200, datetime(2024, 10, 15), value=True)
    _add_answered_event(201, datetime(2024, 11, 12), value=True)
    _add_answered_event(202, datetime(2025, 2, 10), value=True)
    # Season 2025: one response.
    _add_answered_event(203, datetime(2025, 10, 20), value=True)

    resp = client.get("/api/v1/stats/rankings")
    assert resp.status_code == 200

    windows = {w["season"]: w for w in resp.json()["seasons"]}
    # Individual seasons plus an all-time window (season is null).
    assert 2024 in windows
    assert 2025 in windows
    assert None in windows

    def user_in(window):
        return any(it["user"]["id"] == SEEDED_USER_ID for it in window["items"])

    assert user_in(windows[2024])
    assert user_in(windows[2025])

    # Per-season windows expose a response rate; the all-time one does not.
    me_2024 = next(
        it for it in windows[2024]["items"] if it["user"]["id"] == SEEDED_USER_ID
    )
    me_all = next(
        it for it in windows[None]["items"] if it["user"]["id"] == SEEDED_USER_ID
    )
    assert me_2024["ranks"]["response_rate"] is not None
    assert me_all["ranks"]["response_rate"] is None


def _add_backfilled_response(event_id: int, event_date: datetime) -> None:
    """Insert an event answered by the seeded user with a NULL date.

    This is the shape of rows imported from the previous site: the answer
    (yes/no) is known but the answer date is not.
    """
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        session.add(
            models.EventDB(
                id=event_id,
                title=f"Event {event_id}",
                description="backfilled",
                date=event_date,
                costume=Costume.NONE,
                category="TEST",
                is_in_doodle=True,
            )
        )
        session.flush()
        session.add(
            models.ResponseDB(
                value=True,
                date=None,
                event_id=event_id,
                user_id=SEEDED_USER_ID,
            )
        )
        session.commit()


def test_backfilled_response_without_date(client: TestClient):
    """A backfilled response (date=None) must serialize and not break stats.

    ``responses.date`` is nullable for rows imported from the previous site.
    Such a response still counts as an answer (n_responses) but is excluded
    from the average response time (SQL AVG ignores NULLs), so with only a
    NULL-date response in the season the average must be null, not an error.
    """
    _add_backfilled_response(300, datetime.now())

    resp = client.get("/api/v1/responses/", params={"user_id": SEEDED_USER_ID})
    assert resp.status_code == 200
    backfilled = next(r for r in resp.json() if r["event_id"] == 300)
    assert backfilled["value"] is True
    assert backfilled["date"] is None

    resp = client.get("/api/v1/stats/me")
    assert resp.status_code == 200
    stats = resp.json()
    # Counted as a response, positive.
    assert stats["n_responses"] == 1
    assert stats["n_positive_responses"] == 1
    # But excluded from the response-time average.
    assert stats["avg_response_time"] is None
