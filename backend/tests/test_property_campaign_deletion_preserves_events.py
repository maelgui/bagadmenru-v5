# Feature: event-campaigns, Property 8: Deletion Preserves Events
"""
Property 8: Deletion Preserves Events

For any campaign with one or more linked events, deleting the campaign SHALL
result in those events still existing in the database with their campaign_id
set to NULL. The events themselves SHALL NOT be deleted.

**Validates: Requirements 5.1, 5.3, 13.5**
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
    "sqlite:///tests_property_deletion_preserves_events.sqlite?check_same_thread=false"
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
def deletion_scenario(draw):
    """Generate a scenario with a campaign and 1-5 linked events.

    Returns a dict with:
    - num_events: number of events to create and link to the campaign (1-5)
    """
    num_events = draw(st.integers(min_value=1, max_value=5))
    return {"num_events": num_events}


# --- Property Test ---


class TestDeletionPreservesEvents:
    """Property test: Deleting a campaign preserves linked events with campaign_id = NULL."""

    @settings(max_examples=100, deadline=None)
    @given(scenario=deletion_scenario())
    def test_deleting_campaign_preserves_linked_events(self, scenario: dict) -> None:
        """
        **Validates: Requirements 5.1, 5.3, 13.5**

        For any campaign with one or more linked events, deleting the campaign
        SHALL result in:
        1. The campaign no longer existing (404 on retrieval)
        2. All previously linked events still existing in the database
        3. All previously linked events having campaign_id = NULL
        """
        # Setup: fresh database for each test example
        engine = get_engine(DATABASE_URL)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine
        )

        num_events = scenario["num_events"]

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
                id="test-deletion-user",
                email="deletion@example.com",
                first_name="Test",
                last_name="User",
            )
            session.merge(user)

            session.execute(
                user_group_association_table.insert().values(
                    profile_id="test-deletion-user", group_id=1
                )
            )

            # Create events directly in the DB
            for i in range(num_events):
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
                sub="test-deletion-user",
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

                    # Step 1: Create a campaign via the API
                    resp = client.post(
                        "/api/v1/campaigns/",
                        json={
                            "name": "Campaign to delete",
                            "group_id": 1,
                        },
                    )
                    assert (
                        resp.status_code == 201
                    ), f"Failed to create campaign: {resp.text}"
                    campaign_id = resp.json()["id"]

                    # Step 2: Link all events to the campaign
                    event_ids = list(range(1, num_events + 1))
                    for event_id in event_ids:
                        resp = client.post(
                            f"/api/v1/campaigns/{campaign_id}/events/{event_id}"
                        )
                        assert resp.status_code == 200, (
                            f"Failed to link event {event_id} to campaign "
                            f"{campaign_id}: {resp.text}"
                        )

                    # Verify events are linked (campaign detail shows them)
                    resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                    assert resp.status_code == 200
                    campaign_detail = resp.json()
                    linked_event_ids = [e["id"] for e in campaign_detail["events"]]
                    assert sorted(linked_event_ids) == sorted(event_ids), (
                        f"Expected events {event_ids} linked to campaign, "
                        f"got {linked_event_ids}"
                    )

                    # Step 3: Delete the campaign
                    resp = client.delete(f"/api/v1/campaigns/{campaign_id}")
                    assert (
                        resp.status_code == 204
                    ), f"Failed to delete campaign {campaign_id}: {resp.text}"

                    # Step 4: Verify the campaign no longer exists
                    resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                    assert resp.status_code == 404, (
                        f"Campaign {campaign_id} should not exist after deletion, "
                        f"got status {resp.status_code}"
                    )

                    # Step 5: Verify all events still exist with campaign_id = NULL
                    # Check directly in the database
                    with TestingSessionLocal() as session:
                        for event_id in event_ids:
                            db_event = session.get(EventDB, event_id)
                            assert db_event is not None, (
                                f"Event {event_id} should still exist after "
                                f"campaign deletion"
                            )
                            assert db_event.campaign_id is None, (
                                f"Event {event_id} should have campaign_id = NULL "
                                f"after campaign deletion, got "
                                f"campaign_id={db_event.campaign_id}"
                            )

        finally:
            bbe2.utils.auth.is_allowed = original_is_allowed
            app.dependency_overrides.pop(get_settings, None)
