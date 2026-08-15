# Feature: event-campaigns, Property 7: Campaign Update Round-Trip Preserves Status
"""
Property 7: Campaign Update Round-Trip Preserves Status

For any valid partial update payload (name, description, group_id) applied to
an existing campaign, the returned campaign SHALL reflect the provided fields,
preserve unprovided fields, and - even when an arbitrary status value is
injected into the payload - SHALL have the same status as before the update.

**Validates: Requirements 4.1, 4.2**
"""

from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import patch

import jwt
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

# --- Test configuration ---

DATABASE_URL = (
    "sqlite:///tests_property_update_roundtrip.sqlite?check_same_thread=false"
)

USER_ID = "test-user-update"


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


def setup_db() -> None:
    """Create the schema, two groups, and a campaign-manager user.

    Campaigns are created as drafts, and drafts are only visible/updatable
    by campaign managers, so the test user must hold the campaign_manager
    role in one of their groups. A second group exists so that group_id
    updates can target a different existing group.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(GroupDB(id=1, name="TestGroup", color="#123456"))
        session.merge(GroupDB(id=2, name="OtherGroup", color="#654321"))

        role = RoleDB(id="campaign_manager", description="Can manage campaigns")
        session.merge(role)
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        user = UserDB(
            id=USER_ID,
            email="update@example.com",
            first_name="Test",
            last_name="User",
        )
        session.merge(user)
        session.execute(
            user_group_association_table.insert().values(profile_id=USER_ID, group_id=1)
        )
        session.commit()


# --- Strategies ---

# Valid campaign names (1-150 chars, non-empty)
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=150,
).filter(lambda s: s.strip())

# Optional description
description_strategy = st.one_of(
    st.none(),
    st.text(
        alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
        min_size=0,
        max_size=500,
    ),
)

# Arbitrary status values injected into the raw payload: valid lifecycle
# values and random strings alike must all be ignored by the update.
injected_status_strategy = st.one_of(
    st.sampled_from(["draft", "active", "archived"]),
    st.text(
        alphabet=st.characters(whitelist_categories=("L", "N")),
        min_size=1,
        max_size=20,
    ),
)


@st.composite
def update_payload(draw):
    """Generate a random partial update payload over name/description/group_id,
    optionally injecting an arbitrary status value into the raw payload.

    Returns (payload, status_injected).
    """
    include_name = draw(st.booleans())
    include_description = draw(st.booleans())
    include_group_id = draw(st.booleans())
    include_status = draw(st.booleans())

    payload: dict[str, Any] = {}

    if include_name:
        payload["name"] = draw(name_strategy)

    if include_description:
        payload["description"] = draw(description_strategy)

    if include_group_id:
        # Only existing groups (1 and 2 are seeded)
        payload["group_id"] = draw(st.sampled_from([1, 2]))

    if include_status:
        payload["status"] = draw(injected_status_strategy)

    return payload, include_status


# --- Property Test ---


class TestCampaignUpdateRoundTrip:
    """Property test: campaign update reflects provided fields, preserves
    unprovided fields, and never changes the status."""

    @settings(max_examples=100, deadline=None)
    @given(payload_and_flag=update_payload())
    def test_update_roundtrip_preserves_status(
        self, payload_and_flag: tuple[dict[str, Any], bool]
    ) -> None:
        """
        **Validates: Requirements 4.1, 4.2**

        For any valid partial update payload (name, description, group_id):
        1. Provided fields in the response SHALL match the new values
        2. Unprovided fields SHALL remain unchanged
        3. Any status value injected into the raw payload SHALL be ignored:
           the campaign status is unchanged after the update
        """
        update_data, status_injected = payload_and_flag

        # Setup: fresh database for each test example
        setup_db()

        # Override settings and auth
        app.dependency_overrides[get_settings] = get_fake_settings

        try:
            # JWT for the seeded campaign-manager user (drafts are only
            # visible/updatable by campaign managers)
            payload = JwtPayload(
                sub=USER_ID,
                roles=[],
                first_name="Test",
                last_name="User",
                exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
                iat=datetime.now(tz=timezone.utc),
            ).model_dump()
            access_token = jwt.encode(
                payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
            )

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with TestClient(app) as client:
                        client.headers = {"Authorization": f"Bearer {access_token}"}

                        # Step 1: Create a campaign with known initial values
                        create_resp = client.post(
                            "/api/v1/campaigns",
                            json={
                                "name": "Initial Campaign",
                                "description": "Initial description",
                                "group_id": 1,
                            },
                        )
                        assert (
                            create_resp.status_code == 201
                        ), f"Failed to create campaign: {create_resp.text}"
                        campaign_id = create_resp.json()["id"]

                        # Step 2: Get the campaign before update (baseline)
                        get_resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                        assert get_resp.status_code == 200
                        before_update = get_resp.json()

                        # Step 3: Apply the partial update (raw payload may
                        # carry an injected status value)
                        patch_resp = client.patch(
                            f"/api/v1/campaigns/{campaign_id}",
                            json=update_data,
                        )
                        assert (
                            patch_resp.status_code == 200
                        ), f"Failed to update campaign: {patch_resp.text}"
                        updated = patch_resp.json()

                        # Step 4: Provided fields reflect the new values
                        updatable_fields = ["name", "description", "group_id"]
                        for field in updatable_fields:
                            if field in update_data:
                                assert updated[field] == update_data[field], (
                                    f"Field '{field}' should be updated to "
                                    f"'{update_data[field]}' but got "
                                    f"'{updated[field]}'"
                                )

                        # Step 5: Unprovided fields are preserved
                        for field in updatable_fields:
                            if field not in update_data:
                                assert updated[field] == before_update[field], (
                                    f"Field '{field}' should be preserved as "
                                    f"'{before_update[field]}' but got "
                                    f"'{updated[field]}'"
                                )

                        # Step 6: Status is NEVER changed by an update, even
                        # when an arbitrary status was injected in the payload
                        assert updated["status"] == before_update["status"], (
                            f"Status should be preserved as "
                            f"'{before_update['status']}' but got "
                            f"'{updated['status']}' "
                            f"(status injected: {status_injected})"
                        )

                        # Step 7: Non-updatable fields are always preserved
                        assert updated["id"] == before_update["id"]
                        assert updated["created_at"] == before_update["created_at"]
        finally:
            app.dependency_overrides.pop(get_settings, None)
