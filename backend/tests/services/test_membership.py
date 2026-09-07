"""Season-aware membership status computation.

These tests pin the computation to a fixed ``now`` so the season boundary
(1 September) is exercised deterministically rather than depending on the
wall clock. A season runs 1 Sept -> 31 Aug; a membership belongs to the season
containing its order date, and a member is *active* only when a valid (paid)
membership exists for the season that ``now`` falls into.
"""

from datetime import datetime, timezone

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


def _add_membership(session, user_id: str, order_date: datetime, item_id: int):
    session.add(
        models.HelloAssoMembershipDB(
            helloasso_order_id=item_id,
            helloasso_item_id=item_id,
            user_id=user_id,
            tier_description="Adhésion",
            amount=2500,
            order_date=order_date,
            state="Processed",
            raw_payload={},
        )
    )


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
