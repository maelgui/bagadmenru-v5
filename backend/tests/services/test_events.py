"""Tests for bbe2.services.events."""

from datetime import datetime, timedelta

from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.models.base import Base
from bbe2.schemas import Costume
from bbe2.services.events import count_unanswered_events

DATABASE_URL = "sqlite:///tests_services_events.sqlite?check_same_thread=false"
USER_ID = "a8e2d3249e9d997e"


def _session():
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = session_local()
    # users.instrument_id is NOT NULL and FKs a group.
    session.add(models.GroupDB(id=1, name="Piccolo", color="#fff"))
    session.commit()
    return session


def _user(user_id: str):
    return models.UserDB(
        id=user_id,
        email=f"{user_id}@example.com",
        first_name=user_id,
        last_name=user_id,
        instrument_id=1,
    )


def _event(event_id: int, days_from_now: int, is_in_doodle: bool = True):
    return models.EventDB(
        id=event_id,
        title=f"Event {event_id}",
        description="desc",
        date=datetime.now() + timedelta(days=days_from_now),
        costume=Costume.NONE,
        category="TEST",
        is_in_doodle=is_in_doodle,
    )


def test_counts_only_future_unanswered_doodle_events():
    with _session() as session:
        session.add(_user(USER_ID))
        # Future doodle, unanswered -> counts
        session.add(_event(1, days_from_now=5))
        # Future doodle, answered -> excluded
        session.add(_event(2, days_from_now=6))
        session.add(
            models.ResponseDB(
                value=False, date=datetime.now(), event_id=2, user_id=USER_ID
            )
        )
        # Past doodle, unanswered -> excluded (date in the past)
        session.add(_event(3, days_from_now=-5))
        # Future, not in doodle -> excluded
        session.add(_event(4, days_from_now=7, is_in_doodle=False))
        session.commit()

        assert count_unanswered_events(session, USER_ID) == 1


def test_answered_present_or_absent_both_count_as_answered():
    with _session() as session:
        session.add(_user(USER_ID))
        session.add(_event(1, days_from_now=1))
        session.add(_event(2, days_from_now=2))
        # value=True (present) and value=False (absent) both mark answered
        session.add(
            models.ResponseDB(
                value=True, date=datetime.now(), event_id=1, user_id=USER_ID
            )
        )
        session.add(
            models.ResponseDB(
                value=False, date=datetime.now(), event_id=2, user_id=USER_ID
            )
        )
        session.commit()

        assert count_unanswered_events(session, USER_ID) == 0


def test_other_users_responses_do_not_count():
    with _session() as session:
        session.add(_user(USER_ID))
        session.add(_user("other"))
        session.add(_event(1, days_from_now=3))
        # Another user answered, but current user did not -> still counts for us
        session.add(
            models.ResponseDB(
                value=True, date=datetime.now(), event_id=1, user_id="other"
            )
        )
        session.commit()

        assert count_unanswered_events(session, USER_ID) == 1
