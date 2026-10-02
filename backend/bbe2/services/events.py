"""Event-related domain helpers."""

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from bbe2.models.event import EventDB, ResponseChangeDB, ResponseDB

RESPONSE_CHANGE_COOLDOWN = timedelta(minutes=5)


def apply_response(
    session: Session,
    user_id: str,
    event_id: int,
    value: bool,
    now: datetime | None = None,
) -> ResponseDB:
    now = now or datetime.now()

    db_response = session.get(ResponseDB, (event_id, user_id))
    previous_value = db_response.value if db_response is not None else None

    if db_response is not None:
        db_response.value = value
        db_response.date = now
    else:
        db_response = ResponseDB(
            event_id=event_id, user_id=user_id, value=value, date=now
        )
        session.add(db_response)

    if value != previous_value:
        _log_response_change(session, user_id, event_id, previous_value, value, now)

    session.flush()
    return db_response


def _log_response_change(
    session: Session,
    user_id: str,
    event_id: int,
    previous_value: bool | None,
    value: bool,
    now: datetime,
) -> None:
    last_change = session.scalars(
        select(ResponseChangeDB)
        .where(
            ResponseChangeDB.user_id == user_id,
            ResponseChangeDB.event_id == event_id,
        )
        .order_by(ResponseChangeDB.changed_at.desc())
        .limit(1)
    ).first()

    if (
        last_change is not None
        and now - last_change.changed_at < RESPONSE_CHANGE_COOLDOWN
    ):
        if last_change.from_value == value:
            session.delete(last_change)
        else:
            last_change.to_value = value
            last_change.changed_at = now
        return

    session.add(
        ResponseChangeDB(
            user_id=user_id,
            event_id=event_id,
            from_value=previous_value,
            to_value=value,
            changed_at=now,
        )
    )


def count_unanswered_events(session: Session, user_id: str) -> int:
    """Count upcoming doodle events the user has not answered yet.

    "Unanswered" means an upcoming event (``date`` today or later) flagged
    ``is_in_doodle`` for which the user has no ``ResponseDB`` row at all.
    Answering present or absent both count as answered.
    """
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    answered_event_ids = (
        select(ResponseDB.event_id)
        .where(ResponseDB.user_id == user_id)
        .scalar_subquery()
    )

    count = session.scalar(
        select(func.count())  # pylint: disable=not-callable
        .select_from(EventDB)
        .where(
            EventDB.is_in_doodle.is_(True),
            EventDB.date >= today,
            EventDB.id.not_in(answered_event_ids),
        )
    )
    return count or 0
