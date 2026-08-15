# Feature: event-campaigns, Property 9: Event Uniqueness Constraint
"""
Property 9: Event Uniqueness Constraint

For any event that is currently linked to a campaign, attempting to link it
to a different campaign SHALL be rejected (409 Conflict). An event SHALL
belong to at most one campaign at any time.

**Validates: Requirements 6.2, 6.3**
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.orm import sessionmaker

import bbe2.utils.auth
from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models import EventDB, GroupDB
from bbe2.models.base import Base
from bbe2.models.user import (
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas.auth import JwtPayload
from bbe2.schemas.event import Costume

# --- Test configuration ---

DATABASE_URL = (
    "sqlite:///tests_property_event_uniqueness.sqlite?check_same_thread=false"
)


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


# --- Strategies ---


@st.composite
def event_linking_scenario(draw):
    """Generate a scenario with N campaigns (>= 2) and events to link.

    Returns a dict with:
    - num_campaigns: number of campaigns to create (2-5)
    - num_events: number of events to create (1-5)
    - link_first: (campaign_idx, event_idx) - first link to establish
    - link_second: (campaign_idx, event_idx) - second link attempt (different campaign, same event)
    """
    num_campaigns = draw(st.integers(min_value=2, max_value=5))
    num_events = draw(st.integers(min_value=1, max_value=5))

    # Pick an event to link first
    event_idx = draw(st.integers(min_value=0, max_value=num_events - 1))

    # Pick two different campaigns
    first_campaign_idx = draw(st.integers(min_value=0, max_value=num_campaigns - 1))
    second_campaign_idx = draw(
        st.integers(min_value=0, max_value=num_campaigns - 1).filter(
            lambda x: x != first_campaign_idx
        )
    )

    return {
        "num_campaigns": num_campaigns,
        "num_events": num_events,
        "event_idx": event_idx,
        "first_campaign_idx": first_campaign_idx,
        "second_campaign_idx": second_campaign_idx,
    }


# --- Property Test ---


class TestEventUniquenessConstraint:
    """Property test: An event linked to one campaign cannot be linked to another."""

    @settings(max_examples=100, deadline=None)
    @given(scenario=event_linking_scenario())
    def test_event_linked_to_one_campaign_cannot_be_linked_to_another(
        self, scenario: dict
    ) -> None:
        """
        **Validates: Requirements 6.2, 6.3**

        For any event currently linked to a campaign, attempting to link it to
        a different campaign SHALL return 409 Conflict. An event SHALL belong
        to at most one campaign at any time.
        """
        # Setup: fresh database for each test example
        engine = get_engine(DATABASE_URL)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine
        )

        # Seed group, role, and user with campaign_manager permission
        with TestingSessionLocal() as session:
            group = GroupDB(id=1, name="TestGroup", color="#abc")
            session.merge(group)

            role = RoleDB(id="campaign_manager", description="Can manage campaigns")
            session.merge(role)

            session.execute(
                group_role_association_table.insert().values(
                    group_id=1, role_id="campaign_manager"
                )
            )

            user = UserDB(
                id="test-uniqueness-user",
                email="uniqueness@example.com",
                first_name="Test",
                last_name="User",
            )
            session.merge(user)

            session.execute(
                user_group_association_table.insert().values(
                    profile_id="test-uniqueness-user", group_id=1
                )
            )

            # Create events directly in the DB
            for i in range(scenario["num_events"]):
                event = EventDB(
                    id=i + 1,
                    title=f"Event {i}",
                    description=f"Description for event {i}",
                    date=datetime(2025, 6, 15 + i, tzinfo=timezone.utc),
                    costume=Costume.POLO,
                    category="rehearsal",
                    is_in_doodle=False,
                )
                session.merge(event)

            session.commit()

        # Override settings and auth
        app.dependency_overrides[get_settings] = get_fake_settings
        original_is_allowed = bbe2.utils.auth.is_allowed

        try:
            bbe2.utils.auth.is_allowed = fake_is_allowed

            payload = JwtPayload(
                sub="test-uniqueness-user",
                roles=[],
                first_name="Test",
                last_name="User",
                exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
                iat=datetime.now(tz=timezone.utc),
            ).model_dump()
            access_token = jwt.encode(
                payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
            )

            with patch("bbe2.main.scheduler"):
                with TestClient(app) as client:
                    client.headers = {"Authorization": f"Bearer {access_token}"}

                    # Create campaigns via the API
                    campaign_ids = []
                    for i in range(scenario["num_campaigns"]):
                        resp = client.post(
                            "/api/v1/campaigns/",
                            json={
                                "name": f"Campaign {i}",
                                "group_id": 1,
                            },
                        )
                        assert (
                            resp.status_code == 201
                        ), f"Failed to create campaign {i}: {resp.text}"
                        campaign_ids.append(resp.json()["id"])

                    # Get the event ID and the two campaign IDs from the scenario
                    event_id = scenario["event_idx"] + 1
                    first_campaign_id = campaign_ids[scenario["first_campaign_idx"]]
                    second_campaign_id = campaign_ids[scenario["second_campaign_idx"]]

                    # Link the event to the first campaign - should succeed
                    resp = client.post(
                        f"/api/v1/campaigns/{first_campaign_id}/events/{event_id}"
                    )
                    assert resp.status_code == 200, (
                        f"Expected 200 when linking event {event_id} to campaign "
                        f"{first_campaign_id}, got {resp.status_code}: {resp.text}"
                    )

                    # Attempt to link the same event to a different campaign - should get 409
                    resp = client.post(
                        f"/api/v1/campaigns/{second_campaign_id}/events/{event_id}"
                    )
                    assert resp.status_code == 409, (
                        f"Expected 409 Conflict when linking event {event_id} "
                        f"(already in campaign {first_campaign_id}) to campaign "
                        f"{second_campaign_id}, got {resp.status_code}: {resp.text}"
                    )

                    # Verify the error detail
                    detail = resp.json().get("detail", "")
                    assert (
                        "already linked" in detail.lower()
                    ), f"Expected 'already linked' in error detail, got: {detail}"

                    # Additionally: verify the event is still linked to the first campaign
                    # by retrieving the first campaign and checking its events list
                    resp = client.get(f"/api/v1/campaigns/{first_campaign_id}")
                    assert resp.status_code == 200
                    campaign_detail = resp.json()
                    event_ids_in_campaign = [e["id"] for e in campaign_detail["events"]]
                    assert event_id in event_ids_in_campaign, (
                        f"Event {event_id} should still be linked to campaign "
                        f"{first_campaign_id}"
                    )

        finally:
            bbe2.utils.auth.is_allowed = original_is_allowed
            app.dependency_overrides.pop(get_settings, None)
