from datetime import datetime
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
