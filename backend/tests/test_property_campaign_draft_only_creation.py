# Feature: event-campaigns, Property 2: Created Status Is Always Draft
"""
Property 2: Created Status Is Always Draft

For any campaign creation payload, including payloads carrying an arbitrary
injected `status` value ('active', 'archived', or any string), the created
campaign SHALL have status 'draft'.

**Validates: Requirements 1.4, 1.5**
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

DATABASE_URL = (
    "sqlite:///tests_property_draft_only_creation.sqlite?check_same_thread=false"
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


def setup_db_with_campaign_manager():
    """Create the DB schema and populate with a user that has campaign_manager role."""
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
name_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=("L", "N", "P", "Z"),
        blacklist_characters="\x00",
    ),
    min_size=1,
    max_size=150,
).filter(lambda s: s.strip())

# Injected status values: valid lifecycle values and arbitrary strings
injected_status_strategy = st.one_of(
    st.sampled_from(["draft", "active", "archived"]),
    st.text(
        alphabet=st.characters(
            whitelist_categories=("L", "N", "P", "Z"),
            blacklist_characters="\x00",
        ),
        min_size=0,
        max_size=50,
    ),
)


@st.composite
def creation_payload_with_injected_status(draw):
    """Generate a valid campaign creation payload with an injected status field.

    The payload is otherwise valid (name 1-150 chars, existing group_id) but
    carries a raw `status` key that the server must discard.
    """
    return {
        "name": draw(name_strategy),
        "group_id": 1,
        "status": draw(injected_status_strategy),
    }


# --- Property Test ---


class TestCampaignDraftOnlyCreation:
    """Property test: Created Status Is Always Draft."""

    @settings(max_examples=100, deadline=None)
    @given(payload=creation_payload_with_injected_status())
    def test_created_campaign_status_is_always_draft(
        self, campaign_client: TestClient, payload: dict
    ) -> None:
        """
        **Validates: Requirements 1.4, 1.5**

        For any campaign creation payload, including payloads carrying an
        arbitrary injected `status` value, the created campaign SHALL have
        status 'draft' — both in the creation response and on retrieval.
        """
        # Create the campaign with an injected raw status value
        create_response = campaign_client.post("/api/v1/campaigns/", json=payload)
        assert (
            create_response.status_code == 201
        ), f"Failed to create campaign: {create_response.text}"
        created = create_response.json()

        # The creation response must report status 'draft', regardless of the
        # injected value
        assert created["status"] == "draft", (
            f"Injected status {payload['status']!r} leaked into creation "
            f"response: {created['status']!r}"
        )

        # Retrieval must also report status 'draft'
        get_response = campaign_client.get(f"/api/v1/campaigns/{created['id']}")
        assert (
            get_response.status_code == 200
        ), f"Failed to retrieve campaign: {get_response.text}"
        retrieved = get_response.json()

        assert retrieved["status"] == "draft", (
            f"Injected status {payload['status']!r} persisted: "
            f"{retrieved['status']!r}"
        )
