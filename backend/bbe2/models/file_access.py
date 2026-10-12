from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.schemas.file import FileAccessAction


class FileAccessDB(Base):
    __tablename__ = "file_access"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="cascade"), nullable=False
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="set null"), nullable=True
    )
    action: Mapped[FileAccessAction] = mapped_column(nullable=False)
    # pylint: disable=not-callable
    at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_file_access_file_at", "file_id", "at"),
        Index("idx_file_access_user_at", "user_id", "at"),
        Index("idx_file_access_at", "at"),
    )
