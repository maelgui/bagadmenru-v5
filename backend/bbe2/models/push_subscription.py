"""Push subscription model."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from bbe2.models.base import Base


class PushSubscriptionDB(Base):
    """Push subscription ORM model for Web Push notifications."""

    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=False, index=True
    )
    endpoint: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(256), nullable=False)
    auth: Mapped[str] = mapped_column(String(256), nullable=False)
    # Raw User-Agent captured at subscribe time; parsed into a friendly label
    # on the frontend so we never freeze a fragile UA-parsing in the DB.
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # Set to the time of the last successfully sent push, so the UI can show
    # "last notification sent ...". Null means no push has been sent yet.
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # pylint: disable=not-callable
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
