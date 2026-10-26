from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.models.user import UserDB
from bbe2.schemas import PasskeyOrigin


class PasskeyDB(Base):
    __tablename__ = "passkeys"

    passkey_user_id: Mapped[bytes] = mapped_column(ForeignKey("users.passkey_user_id"))
    user: Mapped["UserDB"] = relationship()

    credential_id: Mapped[bytes] = mapped_column(primary_key=True)
    public_key: Mapped[bytes]
    sign_count: Mapped[int]
    transports: Mapped[str]
    device_type: Mapped[str]
    back_up: Mapped[bool]
    aaguid: Mapped[str]
    # NULL for passkeys registered before the origin was recorded.
    origin: Mapped[Optional[PasskeyOrigin]]

    last_use_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_use_ip: Mapped[str] = mapped_column(nullable=True)
    last_use_ua: Mapped[str] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),  # pylint: disable=not-callable
    )
