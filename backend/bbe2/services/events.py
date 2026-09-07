"""Event-related domain helpers."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from bbe2.models.event import EventDB, ResponseDB


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
