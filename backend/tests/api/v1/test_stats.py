"""Tests for the stats endpoints.

Focus: the "upcoming" cutoff must be midnight today, not the current time, so
the home-page banner (n_upcoming_event - n_upcomming_responses) stays
consistent with the PWA app badge throughout the day. An event scheduled
earlier today must still count as upcoming.
"""

from datetime import datetime

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
