"""User profile models."""

from typing import List

from sqlalchemy import Column, ForeignKey, Integer, PickleType, String, Table
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.database import Base

profile_group_association_table = Table(
    "profile_group_association_table",
    Base.metadata,
    Column("profile_id", ForeignKey("profiles.id")),
    Column("group_id", ForeignKey("groups.id")),
)

group_permission_association_table = Table(
    "group_permission_association_table",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id")),
    Column("permission_id", ForeignKey("permissions.id")),
)


class Profile(Base):
    """User profile ORM model."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(256), nullable=False)
    first_name: Mapped[str] = mapped_column(String(30), nullable=False)
    last_name: Mapped[str] = mapped_column(String(30), nullable=False)
    picture_key: Mapped[str] = mapped_column(String(128), nullable=True)
    instrument_id: Mapped[int] = mapped_column(
        ForeignKey("instruments.id"), nullable=True
    )
    instrument: Mapped["Instrument"] = relationship("Instrument")
    groups: Mapped[List["Group"]] = relationship(
        secondary=profile_group_association_table
    )


class Group(Base):
    """Group ORM model."""

    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    permissions: Mapped[List["Permission"]] = relationship(
        secondary=group_permission_association_table
    )


class Instrument(Base):
    """Instrument ORM model."""

    __tablename__ = "instruments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#fff")


class Permission(Base):
    """Permission ORM model."""

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(String(255), primary_key=True)
    tag: Mapped[str] = mapped_column(String(127), nullable=False)
    name: Mapped[str] = mapped_column(String(127), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
