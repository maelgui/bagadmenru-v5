"""Membership domain logic: seasons, ingestion, and status computation.

A *season* runs from 1 September to 31 August (matching the season convention
used elsewhere, e.g. stats). A membership belongs to the season that contains
its order date. A member is *active* when a processed membership exists for the
current season.
"""

import logging
from datetime import datetime, timezone
from typing import Iterable, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from bbe2.models import HelloAssoMembershipDB, UserDB
from bbe2.schemas.helloasso import (
    HelloAssoNotification,
    MembershipHistoryItem,
    MembershipInfo,
    MembershipStatus,
)

logger = logging.getLogger(__name__)

# HelloAsso item type identifying a membership.
MEMBERSHIP_ITEM_TYPE = "Membership"

# Month (1-12) on which a new season starts.
SEASON_START_MONTH = 9

# Item states that count as a valid (paid) membership. HelloAsso item states
# include Processed, Registered, Unknown, Canceled, Refunded, Refunding.
# "Registered" is kept alongside "Processed" because it is the state HelloAsso
# assigns to a completed free/manually-validated membership (amount 0), which
# we still consider a valid adhesion for the season.
VALID_STATES = {"Processed", "Registered"}


def season_start_year(moment: datetime) -> int:
    """Return the calendar year in which the season containing ``moment`` began.

    From September onward we are in the season that started this year; before
    September we are still in the season that started the previous year.
    """
    return moment.year if moment.month >= SEASON_START_MONTH else moment.year - 1


def season_label(moment: datetime) -> str:
    """Human-readable season label, e.g. "2025-2026"."""
    start = season_start_year(moment)
    return f"{start}-{start + 1}"


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def compute_membership_info(
    memberships: Iterable[HelloAssoMembershipDB],
    *,
    now: Optional[datetime] = None,
) -> MembershipInfo:
    """Compute status + history from a member's membership rows."""
    now = now or _now()
    current_start = season_start_year(now)

    rows = sorted(memberships, key=lambda m: m.order_date, reverse=True)

    history: List[MembershipHistoryItem] = []
    active_season: Optional[str] = None
    for row in rows:
        order_dt = _as_aware(row.order_date)
        label = season_label(order_dt)
        history.append(
            MembershipHistoryItem(
                id=row.id,
                tier_description=row.tier_description,
                amount=row.amount,
                order_date=row.order_date,
                state=row.state,
                season=label,
            )
        )
        if (
            row.state in VALID_STATES
            and season_start_year(order_dt) == current_start
            and active_season is None
        ):
            active_season = label

    if active_season is not None:
        status = MembershipStatus.ACTIVE
    elif history:
        status = MembershipStatus.EXPIRED
    else:
        status = MembershipStatus.NONE

    return MembershipInfo(
        status=status,
        current_season=season_label(now),
        active_season=active_season,
        history=history,
    )


def _as_aware(moment: datetime) -> datetime:
    """Treat naive datetimes (e.g. from SQLite) as UTC for season math."""
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment


def get_membership_info_for_user(
    session: Session, user_id: str, *, now: Optional[datetime] = None
) -> MembershipInfo:
    """Load a member's memberships and compute their status + history."""
    rows = session.scalars(
        select(HelloAssoMembershipDB).where(HelloAssoMembershipDB.user_id == user_id)
    ).all()
    return compute_membership_info(rows, now=now)


def ingest_notification(
    session: Session, notification: HelloAssoNotification, raw_payload: dict
) -> int:
    """Ingest a HelloAsso notification, persisting any membership items.

    Idempotent: an item already stored (by ``helloasso_item_id``) is updated in
    place rather than duplicated, so HelloAsso retries are safe. Returns the
    number of membership items processed.
    """
    if notification.event_type != "Order" or notification.data is None:
        return 0

    data = notification.data
    payer = data.payer
    order_id = data.id
    order_date = data.date or _now()

    if order_id is None:
        # Idempotency keys on helloasso_item_id, not order_id, so this is not
        # fatal — but a membership order with no order id is anomalous and worth
        # surfacing for later reconciliation.
        logger.warning(
            "HelloAsso Order notification without an order id; storing item(s) "
            "with helloasso_order_id=0"
        )

    # Auto-link by payer email. Matched case-insensitively because HelloAsso
    # payer emails are not normalized and may differ in case from the member's
    # stored email (e.g. "Jean@x.fr" vs "jean@x.fr"). Unmatched -> user_id
    # stays NULL and the row surfaces in the admin "unlinked" list.
    user_id: Optional[str] = None
    if payer and payer.email:
        user_id = session.scalar(
            select(UserDB.id).where(func.lower(UserDB.email) == payer.email.lower())
        )

    processed = 0
    for item in data.items:
        if item.type != MEMBERSHIP_ITEM_TYPE or item.id is None:
            continue

        existing = session.scalar(
            select(HelloAssoMembershipDB).where(
                HelloAssoMembershipDB.helloasso_item_id == item.id
            )
        )
        if existing is not None:
            # Update mutable fields (state can change: Processed -> Refunded).
            existing.state = item.state or existing.state
            existing.amount = (
                item.amount if item.amount is not None else existing.amount
            )
            existing.raw_payload = raw_payload
            # Keep an existing manual link; only fill it if still empty.
            if existing.user_id is None and user_id is not None:
                existing.user_id = user_id
        else:
            session.add(
                HelloAssoMembershipDB(
                    helloasso_order_id=order_id or 0,
                    helloasso_item_id=item.id,
                    user_id=user_id,
                    payer_email=payer.email if payer else None,
                    payer_first_name=payer.first_name if payer else None,
                    payer_last_name=payer.last_name if payer else None,
                    tier_description=item.tier_description,
                    amount=item.amount or 0,
                    order_date=order_date,
                    state=item.state or "Unknown",
                    raw_payload=raw_payload,
                )
            )
        processed += 1

    session.commit()
    return processed
