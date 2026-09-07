"""HelloAsso membership models.

We only persist *memberships* ingested from HelloAsso order notifications
(``eventType == "Order"`` with an item ``type == "Membership"``). Each row is
the immutable record of one membership item as HelloAsso reported it; the
member's current status is *computed* from these rows (see
``bbe2.services.membership``) rather than stored, so it can never drift out of
sync with the source of truth.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from bbe2.models.base import Base


class HelloAssoMembershipDB(Base):
    """A single membership item ingested from a HelloAsso order notification."""

    __tablename__ = "helloasso_memberships"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )

    # HelloAsso identifiers. ``helloasso_item_id`` is the membership item id and
    # is globally unique on HelloAsso's side; we key idempotency on it so a
    # replayed notification (HelloAsso retries until it gets a 200) updates the
    # existing row instead of inserting a duplicate.
    helloasso_order_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, index=True
    )
    helloasso_item_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False, unique=True, index=True
    )

    # Member link. Nullable because the payer email may not match any member
    # (e.g. a parent paying for their child, or a typo). Unmatched rows are
    # "unlinked" and can be attached to a member manually by an admin.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=True, index=True
    )

    # Raw payer info, kept verbatim to help an admin reconcile unlinked rows.
    payer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payer_first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payer_last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # The membership formula label (HelloAsso "tier"), e.g. "Adhésion adulte".
    tier_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Amount in cents, as HelloAsso reports it.
    amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Order date drives which season the membership belongs to.
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # HelloAsso item state (e.g. "Processed", "Refunded", "Canceled").
    state: Mapped[str] = mapped_column(String(32), nullable=False)

    # Full notification payload, as a safety net so we never lose information
    # HelloAsso sent even if we don't map it to a column yet.
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)

    # pylint: disable=not-callable
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
