# Feature: event-campaigns, Property 14: Derived Date Range and Event Ordering
"""
Property 14: Derived Date Range and Event Ordering

For any campaign with an arbitrary set of linked events, the API SHALL report
`first_event_date` equal to the minimum linked event date and `last_event_date`
equal to the maximum, or both as null when the campaign has no linked events;
and the campaign detail SHALL list the linked events ordered by date ascending.

**Validates: Requirements 13.7, 10.1, 10.2, 11.4**
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.orm import sessionmaker

from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models import CampaignDB, EventDB
from bbe2.models.base import Base
from bbe2.models.user import (
    GroupDB,
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas.auth import JwtPayload
from bbe2.schemas.event import Costume

# --- Test configuration ---

DATABASE_URL = "sqlite:///tests_property_derived_dates.sqlite?check_same_thread=false"


def get_fake_settings():
    return Settings.model_validate(
        {
            "database_url": DATABASE_URL,
            "s3_endpoint": "https://mys3.example.com/",
            "s3_access_key_id": "test",
            "s3_secret_access_key": "test",
            "s3_bucket_name": "testbucket",
            "token_secret_key": "testtokensecret",
            "jwt_secret_key": "myjwtsecretkey",
        }
    )


def fake_is_allowed(roles, action, resource) -> bool:
    """Always allow in tests."""
    return True


def setup_db_with_campaigns(event_date_sets: list[list[date]]) -> None:
    """Create the schema, a campaign-manager user, and one campaign per date
    set, each with one linked event per date (inserted in generation order,
    which is random with respect to the dates).

    Campaigns keep their default "draft" status, so the requesting user must
    be a campaign manager to see them (draft visibility rule). Events are
    seeded directly in the DB to avoid notification side effects; the date
    column is a datetime, and API-created events store midnight datetimes
    (EventCreate.date is a date), so midnight datetimes are seeded here.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        # Group for campaign ownership
        group = GroupDB(id=1, name="TestGroup", color="#123456")
        session.merge(group)

        # campaign_manager role assigned to the group, user in the group
        role = RoleDB(id="campaign_manager", description="Can manage campaigns")
        session.merge(role)
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        user = UserDB(
            id="test-user-dates",
            email="dates@example.com",
            first_name="Test",
            last_name="User",
        )
        session.merge(user)
        session.execute(
            user_group_association_table.insert().values(
                profile_id="test-user-dates", group_id=1
            )
        )

        # One campaign per date set, with one linked event per date
        for i, event_dates in enumerate(event_date_sets):
            campaign = CampaignDB(name=f"Campaign {i}", group_id=1)
            session.add(campaign)
            session.flush()  # assign campaign.id
            for j, event_date in enumerate(event_dates):
                session.add(
                    EventDB(
                        title=f"Event {i}-{j}",
                        description="Property test event",
                        date=datetime(
                            event_date.year, event_date.month, event_date.day
                        ),
                        costume=Costume.NONE,
                        category="concert",
                        is_in_doodle=False,
                        campaign_id=campaign.id,
                    )
                )

        session.commit()


# --- Strategies ---

dates_strategy = st.dates(
    min_value=date(2000, 1, 1),
    max_value=date(2100, 12, 31),
)


@st.composite
def campaign_event_date_sets(draw):
    """Generate 1-3 campaigns, each with 0-6 linked event dates.

    Empty sets are explicitly allowed (no-events case) and duplicate dates
    are permitted (min/max and ordering must still hold).
    """
    return draw(
        st.lists(
            st.lists(dates_strategy, min_size=0, max_size=6),
            min_size=1,
            max_size=3,
        )
    )


# --- Property Test ---


class TestCampaignDerivedDateRange:
    """Property test: derived date range and event ordering on campaign APIs."""

    @settings(max_examples=100, deadline=None)
    @given(event_date_sets=campaign_event_date_sets())
    def test_derived_date_range_and_event_ordering(
        self, event_date_sets: list[list[date]]
    ) -> None:
        """
        **Validates: Requirements 13.7, 10.1, 10.2, 11.4**

        For any campaign with random linked event date sets (including empty):
        - GET /campaigns (SQL aggregates) and GET /campaigns/{id} (eager-loaded
          events) both report first_event_date == min and last_event_date ==
          max of the linked event dates, or both null when there are none.
        - GET /campaigns/{id} lists the linked events ordered by date
          ascending, and exactly the linked events (as a multiset of dates).
        """
        # Setup: fresh database for each test example
        setup_db_with_campaigns(event_date_sets)

        # Override settings and auth
        app.dependency_overrides[get_settings] = get_fake_settings

        try:
            # JWT for the seeded campaign-manager user (drafts are only
            # visible to campaign managers)
            payload = JwtPayload(
                sub="test-user-dates",
                roles=[],
                first_name="Test",
                last_name="User",
                exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
                iat=datetime.now(tz=timezone.utc),
            ).model_dump()
            access_token = jwt.encode(
                payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
            )

            expected_by_name = {
                f"Campaign {i}": dates for i, dates in enumerate(event_date_sets)
            }

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with TestClient(app) as client:
                        client.headers = {"Authorization": f"Bearer {access_token}"}

                        # --- List endpoint: derived range from SQL aggregates
                        resp = client.get("/api/v1/campaigns/")
                        assert resp.status_code == 200
                        campaigns = resp.json()
                        assert len(campaigns) == len(event_date_sets)

                        for item in campaigns:
                            seeded_dates = expected_by_name[item["name"]]
                            if seeded_dates:
                                assert (
                                    item["first_event_date"]
                                    == min(seeded_dates).isoformat()
                                ), (
                                    f"List first_event_date mismatch for "
                                    f"{item['name']}: got "
                                    f"{item['first_event_date']}, "
                                    f"seeded dates {seeded_dates}"
                                )
                                assert (
                                    item["last_event_date"]
                                    == max(seeded_dates).isoformat()
                                )
                            else:
                                assert item["first_event_date"] is None
                                assert item["last_event_date"] is None

                        # --- Detail endpoint: derived range + event ordering
                        for item in campaigns:
                            seeded_dates = expected_by_name[item["name"]]
                            detail_resp = client.get(f"/api/v1/campaigns/{item['id']}")
                            assert detail_resp.status_code == 200
                            detail = detail_resp.json()

                            if seeded_dates:
                                assert (
                                    detail["first_event_date"]
                                    == min(seeded_dates).isoformat()
                                )
                                assert (
                                    detail["last_event_date"]
                                    == max(seeded_dates).isoformat()
                                )
                            else:
                                assert detail["first_event_date"] is None
                                assert detail["last_event_date"] is None

                            returned_dates = [
                                date.fromisoformat(event["date"])
                                for event in detail["events"]
                            ]

                            # Exactly the linked events (multiset of dates)
                            assert sorted(returned_dates) == sorted(seeded_dates)

                            # Ordered by date ascending
                            assert returned_dates == sorted(returned_dates), (
                                f"Detail events not in ascending date order "
                                f"for {item['name']}. Got: {returned_dates}"
                            )
        finally:
            app.dependency_overrides.pop(get_settings, None)
