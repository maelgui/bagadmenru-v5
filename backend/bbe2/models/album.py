"""Photo gallery ORM models."""

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.models.base import Base


class AlbumDB(Base):
    """Photo album ORM model."""

    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(30))
    date: Mapped[datetime]


class PhotoDB(Base):
    """Photo ORM model."""

    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30))
    file_key: Mapped[str] = mapped_column(String(128))
    is_root: Mapped[bool]

    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"))
    album: Mapped["AlbumDB"] = relationship()
