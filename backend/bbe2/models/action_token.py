"""Server-side action-token model.

A single table backs every kind of one-off, email-delivered action link:
password reset, event RSVP quick answer, and unsubscribe. Each row is one
issued token.

Like the refresh-token sessions table, the raw token is never stored -- only its
SHA-256 hash is kept, so a database leak cannot be used to replay a link. The
``token_type`` column lets one table hold multiple token kinds, and ``payload``
carries the type-specific data (e.g. ``user_id``, ``event_id``) that used to be
embedded in the signed itsdangerous token.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from bbe2.models.base import Base


class ActionTokenValue(Enum):
    """The kinds of action token, and their validity/replay policy."""

    CreateResponseByToken = "CreateResponseByToken"
    ResetPassword = "ResetPassword"
    Unsubscribe = "Unsubscribe"

    @property
    def max_age(self) -> int:
        match self:
            case ActionTokenValue.CreateResponseByToken:
                return 3600 * 24 * 7  # 7 jours
            case ActionTokenValue.ResetPassword:
                return 3600  # 1h
            case ActionTokenValue.Unsubscribe:
                return 3600 * 24 * 7  # 7 jours
            case _:
                return 0

    @property
    def single_use(self) -> bool:
        """Whether a token of this type is invalidated after its first use.

        Password resets must not be replayable, so they are single-use. The RSVP
        quick-answer and unsubscribe links are meant to be re-openable within
        their validity window, so they are reusable.
        """
        return self is ActionTokenValue.ResetPassword


class ActionTokenDB(Base):
    """Random, server-side action token (reset / RSVP / unsubscribe)."""

    __tablename__ = "action_tokens"

    # SHA-256 hex digest of the raw token handed out in the email link, and the
    # primary key: every lookup is by hash, so no separate surrogate id is
    # needed. The raw token is never stored, so a database leak cannot be used
    # to replay a link.
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)

    # The kind of action this token authorizes; matches ActionTokenValue.value.
    token_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # Type-specific data (user_id, event_id, ...). Replaces the fields that were
    # previously embedded in the signed token.
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),  # pylint: disable=not-callable
        nullable=False,
    )
    # Hard expiry. The token is invalid once this passes.
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Set the first time a single-use token is consumed. Reusable token types
    # (e.g. the RSVP link) leave this null.
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Set when the token is explicitly invalidated before expiry.
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
