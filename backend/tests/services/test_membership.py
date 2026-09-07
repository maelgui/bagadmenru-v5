"""Season-aware membership status computation.

These tests pin the computation to a fixed ``now`` so the season boundary
(1 September) is exercised deterministically rather than depending on the
wall clock. A season runs 1 Sept -> 31 Aug; a membership belongs to the season
containing its order date, and a member is *active* only when a valid (paid)
membership exists for the season that ``now`` falls into.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from bbe2 import models
from bbe2.database import get_engine
from bbe2.schemas.helloasso import MembershipStatus
from bbe2.services import membership as membership_service

DB_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def _session():
    from sqlalchemy.orm import Session

    engine = get_engine(DB_URL)
    models.Base.metadata.create_all(bind=engine)
    return Session(engine)


def _add_membership(
    session, user_id, order_date: datetime, item_id: int, received_at=None
):
    kwargs = dict(
        helloasso_order_id=item_id,
        helloasso_item_id=item_id,
        user_id=user_id,
        tier_description="Adhésion",
        amount=2500,
        order_date=order_date,
        state="Processed",
        raw_payload={},
    )
    if received_at is not None:
        kwargs["received_at"] = received_at
    session.add(models.HelloAssoMembershipDB(**kwargs))


def test_season_start_year_boundary():
    # 31 August 2026 is still the 2025 season; 1 September 2026 flips to 2026.
    assert (
        membership_service.season_start_year(datetime(2026, 8, 31, tzinfo=timezone.utc))
        == 2025
    )
    assert (
        membership_service.season_start_year(datetime(2026, 9, 1, tzinfo=timezone.utc))
        == 2026
    )


def test_status_by_user_follows_season(client):
    """The same membership row is active in its season and expired later.

    ``client`` is only used to build/clean the shared SQLite schema; we drive
    the service directly with an explicit ``now`` to move across seasons.
    """
    with _session() as session:
        # One order dated 5 Sept 2026 -> belongs to the 2026-2027 season.
        _add_membership(
            session,
            "a8e2d3249e9d997e",
            datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc),
            item_id=9001,
        )
        session.commit()

        # Viewed from within the 2026-2027 season -> active.
        in_season = membership_service.compute_info_by_user(
            session, now=datetime(2026, 10, 1, tzinfo=timezone.utc)
        )
        assert in_season["a8e2d3249e9d997e"].status == MembershipStatus.ACTIVE
        # The badge label comes from active_season.
        assert in_season["a8e2d3249e9d997e"].active_season == "2026-2027"

        # Viewed from the previous season (Aug 2026) -> that order is in the
        # future season, so nothing counts yet -> expired (a row exists but not
        # for the viewed season).
        prev_season = membership_service.compute_info_by_user(
            session, now=datetime(2026, 8, 15, tzinfo=timezone.utc)
        )
        assert prev_season["a8e2d3249e9d997e"].status == MembershipStatus.EXPIRED
        assert prev_season["a8e2d3249e9d997e"].active_season is None

        # Viewed from a later season (Oct 2027) -> membership lapsed -> expired.
        next_season = membership_service.compute_info_by_user(
            session, now=datetime(2027, 10, 1, tzinfo=timezone.utc)
        )
        assert next_season["a8e2d3249e9d997e"].status == MembershipStatus.EXPIRED
        assert next_season["a8e2d3249e9d997e"].active_season is None


def test_purge_unlinked_memberships_removes_only_stale_unlinked():
    """Purge deletes old unlinked rows, keeps linked and recent unlinked ones."""
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    old = now - timedelta(days=40)
    recent = now - timedelta(days=5)

    with _session() as session:
        # Wipe any rows from other tests sharing the SQLite file.
        session.execute(delete(models.HelloAssoMembershipDB))
        session.commit()

        # Stale + unlinked -> should be deleted.
        _add_membership(session, None, old, item_id=1, received_at=old)
        # Recent + unlinked -> kept (still within the reconciliation window).
        _add_membership(session, None, recent, item_id=2, received_at=recent)
        # Stale but LINKED -> never touched.
        _add_membership(session, "some-user", old, item_id=3, received_at=old)
        session.commit()

        deleted = membership_service.purge_unlinked_memberships(
            session, ttl_days=30, now=now
        )
        assert deleted == 1

        remaining = {
            row.helloasso_item_id
            for row in session.scalars(select(models.HelloAssoMembershipDB)).all()
        }
        assert remaining == {2, 3}


def test_purge_unlinked_memberships_disabled_when_ttl_zero():
    """A ttl_days of 0 disables the purge entirely (no-op)."""
    now = datetime(2026, 9, 8, tzinfo=timezone.utc)
    old = now - timedelta(days=400)

    with _session() as session:
        session.execute(delete(models.HelloAssoMembershipDB))
        session.commit()
        _add_membership(session, None, old, item_id=10, received_at=old)
        session.commit()

        deleted = membership_service.purge_unlinked_memberships(
            session, ttl_days=0, now=now
        )
        assert deleted == 0
        assert (
            session.scalar(
                select(func.count()).select_from(models.HelloAssoMembershipDB)
            )
            == 1
        )
