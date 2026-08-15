"""Campaign ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base

if TYPE_CHECKING:
    from bbe2.models.event import EventDB
    from bbe2.models.user import GroupDB


class CampaignDB(Base):
    """Campaign ORM model."""

    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"))
    # pylint: disable=not-callable
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    group: Mapped["GroupDB"] = relationship()
    # Ordered by date ascending: the campaign detail contract lists linked
    # events chronologically (design Property 14, Req 11.4).
    events: Mapped[list["EventDB"]] = relationship(
        back_populates="campaign", order_by="EventDB.date"
    )
