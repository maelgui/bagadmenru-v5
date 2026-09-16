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
    # Account-recovery grant (also the welcome-email sign-in). The opaque
    # token doubles as the grant's PUBLIC identifier; the emailed 6-digit
    # code (hash in the payload) is the secret — RFC 8628's
    # device_code/user_code split. The stored value keeps the historical
    # "ResetPassword" name so rows in flight (welcome links live 3 days)
    # survive a deploy; only the Python name reflects today's meaning.
    Recovery = "ResetPassword"
    Unsubscribe = "Unsubscribe"
    # Self-service onboarding invitation. The raw token is embedded in a signup
    # link (and QR code). Its payload carries the delivery channel and any
    # prefilled profile data. See api/v1/endpoints/invitations.py.
    Invitation = "Invitation"
    # One-time passcode used to prove ownership of an email address during
    # self-service signup when the invitation email was not proven (QR / copied
    # link). Payload holds the target email, the SHA-256 hash of the 6-digit
    # code, and a remaining-attempts counter.
    EmailVerification = "EmailVerification"

    @property
    def max_age(self) -> int:
        match self:
            case ActionTokenValue.CreateResponseByToken:
                return 3600 * 24 * 7  # 7 jours
            case ActionTokenValue.Recovery:
                # One short expiry for the whole grant (code AND link): the
                # email is triggered by a user action, so the member is
                # actively waiting for it. The welcome email mints its token
                # with an explicit longer expires_in (see profiles.py).
                return 600  # 10 min
            case ActionTokenValue.Unsubscribe:
                return 3600 * 24 * 7  # 7 jours
            case ActionTokenValue.Invitation:
                # One validity window for both channels (link/QR and emailed):
                # use the longer one so an invitation handed out in person or
                # forwarded still works for a few days.
                return 3600 * 24 * 3  # 3 jours
            case ActionTokenValue.EmailVerification:
                return 600  # 10 min
            case _:
                return 0

    @property
    def single_use(self) -> bool:
        """Whether a token of this type is invalidated after its first use.

        Recovery grants sign the member in, so they must not be replayable:
        single-use. The RSVP quick-answer and unsubscribe links are meant to
        be re-openable within their validity window, so they are reusable.

        Invitations are single-use: one invitation onboards exactly one member.
        The EmailVerification (OTP) token is *not* marked single-use here because
        it is validated in-place (matching the submitted code against the stored
        hash and decrementing an attempt counter) and revoked explicitly once the
        signup succeeds; treating it as single_use would consume it on the first
        read before the code is even checked.
        """
        return self in (
            ActionTokenValue.Recovery,
            ActionTokenValue.Invitation,
        )


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
