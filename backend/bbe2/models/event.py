from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.models.user import UserDB
from bbe2.schemas import Costume

if TYPE_CHECKING:
    from bbe2.models.campaign import CampaignDB


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
    campaign_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True
    )

    campaign: Mapped[Optional["CampaignDB"]] = relationship(back_populates="events")
    responses: Mapped[list["ResponseDB"]] = relationship(
        back_populates="event", cascade="all, delete"
    )


class ResponseDB(Base):
    __tablename__ = "responses"

    value: Mapped[bool] = mapped_column(nullable=True)
    date: Mapped[datetime]

    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), primary_key=True)
    event: Mapped["EventDB"] = relationship(back_populates="responses")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    user: Mapped["UserDB"] = relationship()
