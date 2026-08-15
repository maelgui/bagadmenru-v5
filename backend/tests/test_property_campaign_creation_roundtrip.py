# Feature: event-campaigns, Property 1: Campaign Creation Round-Trip
"""
Property 1: Campaign Creation Round-Trip

For any valid campaign creation payload (name ≤ 150 chars, optional description,
existing group_id), creating the campaign and then retrieving it by ID SHALL
return an object with the submitted name, description, and group matching the
input, plus a generated integer identifier and a created_at timestamp.

**Validates: Requirements 1.1, 1.3, 1.6, 2.4**
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
from bbe2.models.user import (
    GroupDB,
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas.auth import JwtPayload

# --- Test settings and helpers ---

DATABASE_URL = "sqlite:///tests_property_roundtrip.sqlite?check_same_thread=false"


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


def setup_db_with_campaign_manager():
    """Create the DB schema and populate with a user that has campaign_manager role.

    The campaign_manager role is required both to create campaigns and to see
    the created draft campaign via GET by id (draft visibility rule).
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with TestingSessionLocal() as session:
        # Create group
        group = GroupDB(id=1, name="TestGroup", color="#abc")
        session.merge(group)

        # Create campaign_manager role
        role = RoleDB(id="campaign_manager", description="Can manage campaigns")
        session.merge(role)

        # Assign role to group
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )

        # Create user
        user = UserDB(
            id="test-campaign-user",
            email="campaign@example.com",
            first_name="Campaign",
            last_name="Manager",
        )
        session.merge(user)

        # Add user to group
        session.execute(
            user_group_association_table.insert().values(
                profile_id="test-campaign-user", group_id=1
            )
        )

        session.commit()


@pytest.fixture(scope="module")
def campaign_client() -> Generator:
    """Create a TestClient with a user that has campaign_manager permission."""
    setup_db_with_campaign_manager()

    app.dependency_overrides[get_settings] = get_fake_settings

    payload = JwtPayload(
        sub="test-campaign-user",
        roles=[],
        first_name="Campaign",
        last_name="Manager",
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


# --- Hypothesis strategies ---

# Valid campaign names: non-empty, at most 150 characters
# Use printable text that won't cause JSON encoding issues
name_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=("L", "N", "P", "Z"),
        blacklist_characters="\x00",
    ),
    min_size=1,
    max_size=150,
).filter(
    lambda s: s.strip()
)  # Ensure non-whitespace-only

# Optional description
description_strategy = st.one_of(
    st.none(),
    st.text(
        alphabet=st.characters(
            whitelist_categories=("L", "N", "P", "Z"),
            blacklist_characters="\x00",
        ),
        min_size=0,
        max_size=500,
    ),
)


@st.composite
def valid_campaign_payload(draw):
    """Generate a valid campaign creation payload.

    Ensures:
    - name is 1-150 chars and non-whitespace-only
    - description is optional
    - group_id is valid (1, our test group)

    No date fields: the campaign date range is derived from linked events.
    """
    name = draw(name_strategy)
    description = draw(description_strategy)

    payload = {
        "name": name,
        "group_id": 1,
    }
    if description is not None:
        payload["description"] = description

    return payload


# --- Property Test ---


class TestCampaignCreationRoundTrip:
    """Property test: Campaign Creation Round-Trip."""

    @settings(max_examples=100, deadline=None)
    @given(payload=valid_campaign_payload())
    def test_create_and_retrieve_campaign_roundtrip(
        self, campaign_client: TestClient, payload: dict
    ) -> None:
        """
        **Validates: Requirements 1.1, 1.3, 1.6, 2.4**

        For any valid campaign creation payload, creating the campaign via POST
        and then retrieving it via GET SHALL return an object with:
        - The submitted name, description, and group matching the input
        - A generated integer 'id'
        - A generated 'created_at' timestamp
        """
        # Create the campaign
        create_response = campaign_client.post("/api/v1/campaigns/", json=payload)
        assert (
            create_response.status_code == 201
        ), f"Failed to create campaign: {create_response.text}"
        created = create_response.json()

        # Verify the created response has a generated integer ID and created_at
        assert isinstance(created["id"], int)
        assert created["id"] > 0
        assert "created_at" in created
        # created_at should be a valid ISO datetime string
        created_at = datetime.fromisoformat(created["created_at"])
        assert created_at is not None

        # Retrieve the campaign by ID (draft: requires campaign_manager)
        get_response = campaign_client.get(f"/api/v1/campaigns/{created['id']}")
        assert (
            get_response.status_code == 200
        ), f"Failed to retrieve campaign: {get_response.text}"
        retrieved = get_response.json()

        # Verify round-trip: all submitted fields match
        assert retrieved["name"] == payload["name"]
        assert retrieved["group_id"] == payload["group_id"]

        # Description: check if provided
        if "description" in payload:
            assert retrieved["description"] == payload["description"]
        else:
            # When not provided, it should be None/null
            assert retrieved["description"] is None

        # Status is server-enforced to 'draft' on creation
        assert retrieved["status"] == "draft"

        # Verify generated fields are present and correct
        assert retrieved["id"] == created["id"]
        assert "created_at" in retrieved
        assert datetime.fromisoformat(retrieved["created_at"]) is not None

        # Verify group relationship is populated
        assert retrieved["group"]["id"] == payload["group_id"]
        assert retrieved["group"]["name"] == "TestGroup"

        # Verify events list is empty and derived date range is unset
        assert retrieved["events"] == []
        assert retrieved["first_event_date"] is None
        assert retrieved["last_event_date"] is None
