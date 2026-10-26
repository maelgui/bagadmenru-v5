from datetime import datetime, time
from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.models.user import UserDB
from bbe2.schemas import Costume


class EventDB(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str]
    date: Mapped[datetime]
    # pylint: disable=not-callable
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    costume: Mapped[Costume]
    category: Mapped[str] = mapped_column(String(30))
    is_in_doodle: Mapped[bool]

    # Optional venue and start time, shown to members with the event and, for
    # public events, to visitors of the public website.
    location: Mapped[Optional[str]] = mapped_column(String(100))
    start_time: Mapped[Optional[time]]

    # Opt-in publication on the public website (``GET /events/public``). Off by
    # default: an event is members-only unless staff explicitly flags it.
    is_public: Mapped[bool] = mapped_column(default=False)
    # Visitor-facing text, distinct from ``description`` which is written for
    # members (meeting point, logistics) and is never exposed publicly.
    public_description: Mapped[Optional[str]]

    responses: Mapped[list["ResponseDB"]] = relationship(
        back_populates="event", cascade="all, delete"
    )


class ResponseDB(Base):
    __tablename__ = "responses"

    value: Mapped[bool] = mapped_column(nullable=True)
    # NULL means the response was imported from the previous site and the
    # actual answer date is unknown; the API always sets a date on creation.
    date: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), primary_key=True)
    event: Mapped["EventDB"] = relationship(back_populates="responses")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    user: Mapped["UserDB"] = relationship()


class ResponseChangeDB(Base):
    __tablename__ = "response_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_value: Mapped[Optional[bool]] = mapped_column(nullable=True)
    to_value: Mapped[bool]
    changed_at: Mapped[datetime] = mapped_column(index=True)

    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True
    )
    event: Mapped["EventDB"] = relationship()
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    user: Mapped["UserDB"] = relationship()
