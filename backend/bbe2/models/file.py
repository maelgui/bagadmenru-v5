"""Filesystem ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models import Base
from bbe2.schemas import FileOrFolderType

if TYPE_CHECKING:
    from bbe2.models.user import UserDB


class FileOrFolderDB(Base):
    """Database representation of file or folder entity."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    file_key: Mapped[str] = mapped_column(String(128), nullable=True)
    type: Mapped[FileOrFolderType]
    children: Mapped[list["FileOrFolderDB"]] = relationship(
        order_by="FileOrFolderDB.name"
    )
    # pylint: disable=not-callable
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())
    uploaded_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="set null"), nullable=True
    )
    uploader: Mapped[Optional["UserDB"]] = relationship(foreign_keys=[uploaded_by])
    modified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    modified_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="set null"), nullable=True
    )
    modifier: Mapped[Optional["UserDB"]] = relationship(foreign_keys=[modified_by])
    size: Mapped[Optional[int]] = mapped_column(nullable=True)

    parent_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="cascade"), nullable=True
    )

    source_format: Mapped[Optional[str]] = mapped_column(
        String(8), nullable=True, default=None
    )
    processing_status: Mapped[Optional[str]] = mapped_column(
        String(16), nullable=True, default=None
    )
    processing_failure_reason: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True, default=None
    )

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="file_unique_per_folder"),
    )
