# Feature: event-campaigns, Property 16: Response Eligibility Based on Group Membership
"""
Property 16: Response Eligibility Based on Group Membership

For any event linked to a campaign, an authenticated user SHALL be able to submit
an attendance response if and only if the user is a member of the campaign's owning
group. Non-members SHALL receive a 403 response.

**Validates: Requirements 15.1, 15.2, 14.7**
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

from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models.base import Base
from bbe2.models.campaign import CampaignDB
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
    "sqlite:///tests_property_response_eligibility.sqlite?check_same_thread=false"
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


# We have multiple groups: the campaign-owning group and other groups.
# Users may or may not be members of the owning group.
# The test generates various membership combinations.

NUM_GROUPS = 3  # Total number of groups in the test scenario
CAMPAIGN_OWNER_GROUP_ID = 1  # The group that owns the campaign
EVENT_BASE_ID = 1000  # Starting ID for events (incremented per test)


def setup_db():
    """Create the DB schema and populate with base data (groups, campaign, event)."""
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with TestingSessionLocal() as session:
        # Create groups
        for i in range(1, NUM_GROUPS + 1):
            group = GroupDB(id=i, name=f"Group_{i}", color="#fff")
            session.merge(group)

        # Create campaign_manager role (needed for auth system)
        role = RoleDB(id="campaign_manager", description="Can manage campaigns")
        session.merge(role)

        # Assign campaign_manager role to group 1
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )

        # Create a campaign owned by group 1 (active: response eligibility is
        # exercised by regular group members, not just campaign managers)
        campaign = CampaignDB(
            id=1,
            name="Test Campaign",
            status="active",
            group_id=CAMPAIGN_OWNER_GROUP_ID,
        )
        session.merge(campaign)

        # Create an event linked to the campaign
        event = EventDB(
            id=EVENT_BASE_ID,
            title="Campaign Event",
            description="An event linked to the campaign",
            date=datetime(2025, 6, 15),
            costume="NONE",
            category="rehearsal",
            is_in_doodle=True,
            campaign_id=1,
        )
        session.merge(event)

        session.commit()


def make_jwt_token(user_id: str) -> str:
    """Create a JWT token for a given user."""
    payload = JwtPayload(
        sub=user_id,
        roles=[],
        first_name="Test",
        last_name="User",
        exp=datetime.now(tz=timezone.utc) + timedelta(hours=1),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    return jwt.encode(payload, get_fake_settings().jwt_secret_key, algorithm="HS256")


def create_user_with_memberships(user_id: str, group_ids: list[int]):
    """Create a user and assign them to the specified groups."""
    engine = get_engine(DATABASE_URL)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with TestingSessionLocal() as session:
        user = UserDB(
            id=user_id,
            email=f"{user_id}@example.com",
            first_name="Test",
            last_name="User",
        )
        session.merge(user)
        session.flush()

        # Remove existing group associations for this user
        from sqlalchemy import delete

        session.execute(
            delete(user_group_association_table).where(
                user_group_association_table.c.profile_id == user_id
            )
        )
        session.flush()

        # Add new group associations
        for gid in group_ids:
            session.execute(
                user_group_association_table.insert().values(
                    profile_id=user_id, group_id=gid
                )
            )

        session.commit()


@pytest.fixture(scope="module")
def eligibility_client() -> Generator:
    """Create a TestClient for response eligibility testing."""
    setup_db()

    app.dependency_overrides[get_settings] = get_fake_settings

    with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
        with patch("bbe2.main.scheduler"):
            with TestClient(app) as cli:
                yield cli

    app.dependency_overrides.clear()


# --- Hypothesis strategies ---


@st.composite
def user_membership_scenario(draw):
    """Generate a user/group membership combination.

    Returns a dict with:
    - user_suffix: unique suffix for the user id (to avoid collisions)
    - member_of_groups: list of group IDs the user belongs to
    - is_member_of_owning_group: bool - whether user is in the campaign's owning group

    The key property: a user is eligible to respond if and only if they are
    a member of the campaign's owning group (group 1).
    """
    # Decide membership for each group independently
    memberships = draw(
        st.lists(st.booleans(), min_size=NUM_GROUPS, max_size=NUM_GROUPS)
    )

    # Build the list of group IDs the user belongs to
    member_of_groups = [i + 1 for i, is_member in enumerate(memberships) if is_member]

    # Whether the user is a member of the owning group
    is_member_of_owning_group = memberships[CAMPAIGN_OWNER_GROUP_ID - 1]

    # Generate a unique user suffix
    user_suffix = draw(st.integers(min_value=1, max_value=100000))

    return {
        "user_suffix": user_suffix,
        "member_of_groups": member_of_groups,
        "is_member_of_owning_group": is_member_of_owning_group,
    }


# --- Property Test ---


class TestResponseEligibilityBasedOnGroupMembership:
    """Property test: Response Eligibility Based on Group Membership."""

    @settings(max_examples=100)
    @given(scenario=user_membership_scenario())
    def test_response_eligibility_based_on_group_membership(
        self, eligibility_client: TestClient, scenario: dict
    ) -> None:
        """
        **Validates: Requirements 15.1, 15.2, 14.7**

        For any event linked to a campaign, an authenticated user SHALL be able
        to submit an attendance response if and only if the user is a member of
        the campaign's owning group. Non-members SHALL receive a 403 response.
        """
        user_id = f"eligibility-user-{scenario['user_suffix']}"

        # Create the user with the generated group memberships
        create_user_with_memberships(user_id, scenario["member_of_groups"])

        # Create a JWT token for this user
        token = make_jwt_token(user_id)

        # Try to submit a response to the campaign-linked event
        response = eligibility_client.put(
            f"/api/v1/events/{EVENT_BASE_ID}/responses",
            json={"value": True},
            headers={"Authorization": f"Bearer {token}"},
        )

        if scenario["is_member_of_owning_group"]:
            # User IS a member of the owning group -> should succeed (200)
            assert response.status_code == 200, (
                f"Expected 200 for group member, got {response.status_code}: "
                f"{response.text}. User groups: {scenario['member_of_groups']}"
            )
            data = response.json()
            assert data["user_id"] == user_id
            assert data["event_id"] == EVENT_BASE_ID
            assert data["value"] is True
        else:
            # User is NOT a member of the owning group -> should get 403
            assert response.status_code == 403, (
                f"Expected 403 for non-member, got {response.status_code}: "
                f"{response.text}. User groups: {scenario['member_of_groups']}"
            )
            assert "Not eligible to respond" in response.json()["detail"]
