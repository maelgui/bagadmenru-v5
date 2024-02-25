from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.database import Base
from bbe2.models.profile import Profile
from bbe2.schemas import Costume


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(30))
    description: Mapped[str]
    date: Mapped[datetime]
    costume: Mapped[Costume]
    category: Mapped[str] = mapped_column(String(30))

    responses: Mapped[list["Response"]] = relationship(back_populates="event")


class Response(Base):
    __tablename__ = "responses"

    value: Mapped[bool] = mapped_column(nullable=True)
    date: Mapped[datetime]

    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), primary_key=True)
    event: Mapped["Event"] = relationship(back_populates="responses")
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    user: Mapped["Profile"] = relationship()
