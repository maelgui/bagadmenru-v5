"""User profile models."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.database import Base


class Profile(Base):
    """User profile ORM model."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(30), nullable=False)
    last_name: Mapped[str] = mapped_column(String(30), nullable=False)
    picture_key: Mapped[str] = mapped_column(String(128), nullable=True)
    instrument_id: Mapped[int] = mapped_column(
        ForeignKey("instruments.id"), nullable=True
    )
    instrument: Mapped["Instrument"] = relationship("Instrument")


class Instrument(Base):
    """Instrument ORM model."""

    __tablename__ = "instruments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#fff")
