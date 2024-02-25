"""Filesystem ORM models."""

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.database import Base
from bbe2.schemas import FileOrFolderType


class FileOrFolder(Base):
    """Database representation of file or folder entity."""

    __tablename__ = "files"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    file_key: Mapped[str] = mapped_column(String(128))
    type: Mapped[FileOrFolderType]
    children: Mapped[list["FileOrFolder"]] = relationship()

    parent_id: Mapped[int] = mapped_column(ForeignKey("files.id", ondelete="cascade"))

    __table_args__ = (
        UniqueConstraint("name", "parent_id", name="file_unique_per_folder"),
    )
