"""Filesystem ORM models."""

from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.database import Base
from bbe2.schemas import FileOrFolderType


class FileOrFolder(Base):
    """Database representation of file or folder entity."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    file_key: Mapped[str] = mapped_column(String(128), nullable=True)
    type: Mapped[FileOrFolderType]
    children: Mapped[list["FileOrFolder"]] = relationship()
    uploaded_at: Mapped[datetime] = mapped_column(default=func.now())

    parent_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="cascade"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="file_unique_per_folder"),
    )
