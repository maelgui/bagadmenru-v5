# Feature: event-campaigns, Property 17: Unlinked Events Preserve Open Response Access
"""
Property 17: Unlinked Events Preserve Open Response Access

For any event with campaign_id = NULL, any authenticated user SHALL be able to
submit an attendance response regardless of their group memberships. The campaign
eligibility check SHALL NOT apply.

**Validates: Requirements 15.3**
"""

from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import patch

import jwt
import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.orm import sessionmaker

import bbe2.utils.auth
from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models.base import Base
from bbe2.models.event import EventDB
from bbe2.models.user import (
    GroupDB,
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas.auth import JwtPayload

# --- Test settings and helpers ---

DATABASE_URL = (
    "sqlite:///tests_property_unlinked_open_access.sqlite?check_same_thread=false"
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


# --- Hypothesis strategies ---

# Strategy for number of groups the user belongs to (0 = no groups at all)
st_num_user_groups = st.integers(min_value=0, max_value=5)

# Strategy for the response value (boolean)
st_response_value = st.booleans()


@st.composite
def unlinked_event_user_scenario(draw):
    """Generate a scenario with an unlinked event and a user with varying group memberships.

    Returns a dict with:
    - num_groups: total number of groups in the system
    - user_member_of: list[bool] - whether the user is a member of each group
    - response_value: bool - the attendance response value to submit
    """
    num_groups = draw(st.integers(min_value=0, max_value=5))
    user_member_of = draw(
        st.lists(st.booleans(), min_size=num_groups, max_size=num_groups)
    )
    response_value = draw(st.booleans())

    return {
        "num_groups": num_groups,
        "user_member_of": user_member_of,
        "response_value": response_value,
    }


# --- Database setup ---

_next_event_id = 1


def setup_db(scenario: dict) -> int:
    """Create the DB schema and populate with an unlinked event and a user
    with the specified group memberships.

    Returns the event_id of the created unlinked event.
    """
    global _next_event_id

    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with TestingSessionLocal() as session:
        # Create groups
        for i in range(scenario["num_groups"]):
            group = GroupDB(id=i + 1, name=f"Group_{i + 1}", color="#fff")
            session.merge(group)

        # Create a basic role for groups
        role = RoleDB(id="member", description="Regular member")
        session.merge(role)

        # Assign role to all groups
        for i in range(scenario["num_groups"]):
            session.execute(
                group_role_association_table.insert().values(
                    group_id=i + 1, role_id="member"
                )
            )

        # Create user
        user = UserDB(
            id="test-unlinked-user",
            email="unlinked@example.com",
            first_name="Unlinked",
            last_name="Tester",
        )
        session.merge(user)

        # Assign user to groups based on scenario
        for i, is_member in enumerate(scenario["user_member_of"]):
            if is_member:
                session.execute(
                    user_group_association_table.insert().values(
                        profile_id="test-unlinked-user", group_id=i + 1
                    )
                )

        # Create an unlinked event (campaign_id = NULL)
        event_id = _next_event_id
        _next_event_id += 1
        event = EventDB(
            id=event_id,
            title="Unlinked Event",
            description="An event not linked to any campaign",
            date=datetime(2025, 6, 15),
            costume="COSTUME",
            category="TEST",
            is_in_doodle=True,
            campaign_id=None,  # Explicitly unlinked
        )
        session.merge(event)

        session.commit()

    return event_id


# --- Fixture ---


@pytest.fixture(scope="module")
def unlinked_client() -> Generator:
    """Create a TestClient for testing unlinked event responses."""
    app.dependency_overrides[get_settings] = get_fake_settings

    payload = JwtPayload(
        sub="test-unlinked-user",
        roles=[],
        first_name="Unlinked",
        last_name="Tester",
        exp=datetime.now(tz=timezone.utc) + timedelta(hours=1),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    access_token = jwt.encode(
        payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
    )

    with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
        with patch("bbe2.main.scheduler"):
            with TestClient(app) as cli:
                cli.headers = {"Authorization": f"Bearer {access_token}"}
                yield cli

    app.dependency_overrides.clear()


# --- Property Test ---


class TestUnlinkedEventsOpenAccess:
    """Property test: Unlinked Events Preserve Open Response Access."""

    @settings(max_examples=100)
    @given(scenario=unlinked_event_user_scenario())
    def test_any_authenticated_user_can_respond_to_unlinked_event(
        self, unlinked_client: TestClient, scenario: dict
    ) -> None:
        """
        **Validates: Requirements 15.3**

        For any event with campaign_id = NULL, any authenticated user SHALL be
        able to submit an attendance response regardless of their group
        memberships. The campaign eligibility check SHALL NOT apply.

        We generate users with varying group memberships (including no groups)
        and verify they can always submit a response to an unlinked event.
        """
        # Setup: create fresh DB with this scenario's user/group configuration
        event_id = setup_db(scenario)

        # Submit a response to the unlinked event
        response = unlinked_client.put(
            f"/api/v1/events/{event_id}/responses",
            json={"value": scenario["response_value"]},
        )

        # The response should always succeed (200) regardless of group membership
        assert response.status_code == 200, (
            f"Expected 200 for unlinked event response, got {response.status_code}. "
            f"User groups: {scenario['user_member_of']}, "
            f"Response body: {response.text}"
        )

        # Verify the response body contains the correct value
        data = response.json()
        assert data["value"] == scenario["response_value"]
        assert data["event_id"] == event_id
        assert data["user_id"] == "test-unlinked-user"
