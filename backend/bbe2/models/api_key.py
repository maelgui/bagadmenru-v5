"""Per-member API key model.

An API key is a long-lived, member-scoped credential used by machine clients
(for example a calendar application subscribing to a personalised ICS feed)
where a browser session cookie is not available.

Like action tokens and refresh sessions, the raw key is never stored -- only
its SHA-256 hash is kept, so a database leak cannot be used to replay a key. A
short, non-secret ``prefix`` of the key is stored in clear so the UI can show
the user which key is which without ever revealing the full secret again.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.models.user import UserDB


class ApiKeyDB(Base):
    """Random, server-side API key scoped to a single member."""

    __tablename__ = "api_keys"

    # SHA-256 hex digest of the raw key handed out once at creation, and the
    # primary key: every lookup is by hash, so no separate surrogate id is
    # needed. The raw key is never stored, so a database leak cannot replay it.
    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)

    # Owner of the key. Deleting the member cascades to their keys.
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user: Mapped["UserDB"] = relationship()

    # Non-secret leading characters of the raw key (e.g. "bmr_ab12cd"). Shown in
    # the UI so a member can tell keys apart without ever seeing the full secret
    # again. Not enough on its own to authenticate.
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)

    # Human-friendly label chosen by the member (e.g. "iPhone calendar").
    label: Mapped[str] = mapped_column(String(64), nullable=False)

    # Surface restriction carried *by the key* (not the member): the list of
    # OpenAPI operation ids (FastAPI ``APIRoute.unique_id``) this key may call.
    # Authentication via this key only reaches an endpoint whose operation id is
    # in this list; the usual RBAC authorization then still applies on top,
    # unchanged. Cookie/JWT sessions have no such list and are never restricted
    # this way -- the restriction lives on the key alone.
    authorized_operations: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),  # pylint: disable=not-callable
        nullable=False,
    )
    # Stamped on each successful authentication so the member can spot and
    # revoke keys that are no longer used.
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Set when the member explicitly revokes the key. A revoked key never
    # authenticates again.
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
