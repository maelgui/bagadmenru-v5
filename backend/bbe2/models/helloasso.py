"""Membership models.

We persist *memberships* ingested from two sources: HelloAsso order
notifications (``eventType == "Order"`` with an item ``type == "Membership"``)
and relayed notifications from the Cercle Montfortais (the parent association).
Each row is the record of one membership as the source reported it; the
member's current status is *computed* from these rows (see
``bbe2.services.membership``) rather than stored, so it can never drift out of
sync with the source of truth.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from bbe2.models.base import Base


class HelloAssoMembershipDB(Base):
    """A single membership ingested from HelloAsso or the Cercle Montfortais."""

    __tablename__ = "helloasso_memberships"

    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_membership_source_id"),
    )

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4())
    )

    # Which source emitted this membership: "helloasso" for a direct HelloAsso
    # order notification, "cercle" for a relayed Cercle Montfortais
    # notification.
    source: Mapped[str] = mapped_column(
        String(16), nullable=False, default="helloasso", index=True
    )

    # The source's own identifier for this membership, kept as the source sends
    # it: the HelloAsso item id (a number, stored as text) or the Cercle
    # adhesion id (an opaque string such as "item:78901234"). Idempotency keys
    # on the ``(source, source_id)`` pair: a replayed HelloAsso notification
    # (retried until it gets a 200) or a Cercle re-send after a member edit
    # updates the existing row in place rather than inserting a duplicate.
    source_id: Mapped[str] = mapped_column(String(128), nullable=False)

    # Member link. Nullable because the payer email may not match any member
    # (e.g. a parent paying for their child, or a typo). Unmatched rows are
    # "unlinked" and can be attached to a member manually by an admin.
    user_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("users.id"), nullable=True, index=True
    )

    # Raw payer info, kept verbatim to help an admin reconcile unlinked rows.
    # The payer is who paid; it is NOT necessarily the member (e.g. a parent
    # paying for their child), so it is used only as a reconciliation hint and
    # as a fallback for auto-linking by email.
    payer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payer_first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payer_last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # The adherent: the person the membership is actually for (HelloAsso
    # ``item.user``). This is who we link to a member. HelloAsso only gives a
    # first/last name here (no email), so the linking email comes from the
    # item's "Email" custom field, falling back to the payer email.
    adherent_first_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    adherent_last_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # The adherent's email, taken from the item's "Email" custom field (see
    # ``HelloAssoItem.custom_field_email``). This is the address we want to
    # contact the adherent on — unlike ``payer_email``, which is whoever paid
    # (often a parent). Nullable because the custom field may be missing or not
    # look like an email. Used to prefill an invitation for an unlinked order.
    adherent_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # The membership formula. HelloAsso gives both a short tier ``name``
    # (e.g. "ADHESION OBLIGATOIRE") and a longer ``tierDescription``; we keep
    # both and display the name first.
    tier_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
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
