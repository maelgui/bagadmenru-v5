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

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import false as sa_false
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

    # True when the key was minted automatically by a UI flow (e.g. the
    # calendar-sync dialog) rather than deliberately created by the member in
    # the settings. Purely informative -- shown as a badge in the key list so
    # members can tell hand-made keys from auto-minted ones. Declared by the
    # client at creation; it grants nothing, so trusting it is harmless.
    auto_generated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=sa_false()
    )

    # Subset of the owner's RBAC permissions this key is allowed to exercise,
    # as "action:resource" strings (e.g. "view:calendar"). A key can never do
    # more than its owner: on each request the operation must be permitted both
    # by the member's roles AND be present in this list. Cookie/JWT sessions
    # have no such list and exercise the member's full permissions -- the
    # narrowing lives on the key alone.
    authorized_permissions: Mapped[list[str]] = mapped_column(
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
