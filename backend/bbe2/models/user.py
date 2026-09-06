"""User profile models."""

import secrets
import uuid
from typing import List, Optional

from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    Table,
    Text,
    false,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from bbe2.models.base import Base

user_group_association_table = Table(
    "user_group_association_table",
    Base.metadata,
    Column("profile_id", ForeignKey("users.id")),
    Column("group_id", ForeignKey("groups.id")),
)

group_role_association_table = Table(
    "group_role_association_table",
    Base.metadata,
    Column("group_id", ForeignKey("groups.id")),
    Column("role_id", ForeignKey("roles.id")),
)


class UserDB(Base):
    """User profile ORM model."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    first_name: Mapped[str] = mapped_column(String(30), nullable=False)
    last_name: Mapped[str] = mapped_column(String(30), nullable=False)
    picture_key: Mapped[str] = mapped_column(String(128), nullable=True)
    instrument_id: Mapped[int] = mapped_column(ForeignKey("groups.id"), nullable=True)
    instrument: Mapped["GroupDB"] = relationship()
    groups: Mapped[List["GroupDB"]] = relationship(
        secondary=user_group_association_table, back_populates="members"
    )
    receives_emails: Mapped[bool] = mapped_column(default=True, server_default=true())
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())

    # passkey specific user id, PII free
    passkey_user_id: Mapped[Optional[bytes]] = mapped_column(
        LargeBinary(), nullable=True, default=secrets.token_bytes
    )
    # passkey_user_id should be unique
    __table_args__ = (Index("idx_passkey_user_id", passkey_user_id, unique=True),)


class GroupDB(Base):
    """Group ORM model."""

    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#fff")
    is_default: Mapped[bool] = mapped_column(default=False, server_default=false())
    # Marks a group that represents a musical instrument (piccolo, bombarde,
    # caisse, ...). Only instrument groups are offered as the "instrument"
    # choice on the public self-service signup form.
    is_instrument: Mapped[bool] = mapped_column(default=False, server_default=false())
    mailing_list: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, nullable=True
    )
    roles: Mapped[List["RoleDB"]] = relationship(secondary=group_role_association_table)
    members: Mapped[List[UserDB]] = relationship(
        secondary=user_group_association_table, back_populates="groups"
    )


class RoleDB(Base):
    """Roles ORM model."""

    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
