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
                tier_name=row.tier_name,
                tier_description=row.tier_description,
                adherent_first_name=row.adherent_first_name,
                adherent_last_name=row.adherent_last_name,
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


def compute_info_by_user(
    session: Session, *, now: Optional[datetime] = None
) -> dict[str, MembershipInfo]:
    """Return each linked member's computed membership info in a single query.

    Loads every linked membership row once and groups them per member, so the
    member list can be enriched without an N+1 per-member lookup. Members with
    no membership row are absent from the mapping; the caller treats a missing
    key as "no membership" (status NONE, no active season).
    """
    rows = session.scalars(
        select(HelloAssoMembershipDB).where(HelloAssoMembershipDB.user_id.is_not(None))
    ).all()

    by_user: dict[str, list[HelloAssoMembershipDB]] = {}
    for row in rows:
        # user_id is guaranteed non-None by the WHERE clause above; assert for
        # the type checker.
        if row.user_id is None:
            continue
        by_user.setdefault(row.user_id, []).append(row)

    return {
        user_id: compute_membership_info(memberships, now=now)
        for user_id, memberships in by_user.items()
    }


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

    processed = 0
    for item in data.items:
        if item.type != MEMBERSHIP_ITEM_TYPE or item.id is None:
            continue

        # Resolve the linking email per item: the membership is for the
        # adherent (``item.user``), whose email is the item's "Email" custom
        # field. HelloAsso does not put an email on ``item.user`` itself, so we
        # fall back to the payer email (always present) when the custom field
        # is missing. Matched case-insensitively; unmatched -> user_id stays
        # NULL and the row surfaces in the admin "unlinked" list.
        link_email = item.custom_field_email() or (payer.email if payer else None)
        user_id: Optional[str] = None
        if link_email:
            user_id = session.scalar(
                select(UserDB.id).where(func.lower(UserDB.email) == link_email.lower())
            )

        # The adherent's own email is specifically the custom-field one (not the
        # payer fallback), persisted so the reconciliation UI can invite the
        # adherent even when the row is unlinked.
        adherent_email = item.custom_field_email()

        adherent = item.user

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
            # Backfill the adherent email if it's newly available and we don't
            # have one yet (e.g. row ingested before this column existed).
            if existing.adherent_email is None and adherent_email is not None:
                existing.adherent_email = adherent_email
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
                    adherent_first_name=adherent.first_name if adherent else None,
                    adherent_last_name=adherent.last_name if adherent else None,
                    adherent_email=adherent_email,
                    tier_name=item.name,
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
