# Feature: event-campaigns, Property 6: One-Way Status Transitions
"""
Property 6: One-Way Status Transitions

For any campaign in any status and any transition action (publish or archive),
the transition SHALL succeed if and only if it matches the allowed table —
publish on a "draft" campaign (→ "active") or archive on an "active" campaign
(→ "archived"). All other (status, action) pairs SHALL return 409 and leave
the campaign status unchanged.

**Validates: Requirements 3.1, 3.2, 3.3**
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.orm import sessionmaker

from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models import CampaignDB
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
    "sqlite:///tests_property_status_transitions.sqlite?check_same_thread=false"
)

USER_ID = "test-user-transitions"
GROUP_ID = 1
CAMPAIGN_ID = 1

STATUSES = ["draft", "active", "archived"]
ACTIONS = ["publish", "archive"]

# Allowed (status, action) -> resulting status. Everything else is a 409.
ALLOWED_TRANSITIONS = {
    ("draft", "publish"): "active",
    ("active", "archive"): "archived",
}


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
    """Always allow the generic role check: authorization is not under test."""
    return True


def setup_db(campaign_status: str) -> None:
    """Create the schema and seed a manager user plus one campaign.

    The campaign is seeded directly in the DB with an arbitrary status (the
    API only ever creates drafts) and has no linked events, so publishing
    never fans out new-event notifications.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(RoleDB(id="campaign_manager", description="Can manage campaigns"))
        session.merge(GroupDB(id=GROUP_ID, name="Managers", color="#fff"))
        session.execute(
            group_role_association_table.insert().values(
                group_id=GROUP_ID, role_id="campaign_manager"
            )
        )
        session.merge(
            UserDB(
                id=USER_ID,
                email="transitions@example.com",
                first_name="Test",
                last_name="User",
            )
        )
        session.execute(
            user_group_association_table.insert().values(
                profile_id=USER_ID, group_id=GROUP_ID
            )
        )
        session.add(
            CampaignDB(
                id=CAMPAIGN_ID,
                name="Transition campaign",
                group_id=GROUP_ID,
                status=campaign_status,
            )
        )
        session.commit()


# --- Property Test ---


class TestOneWayStatusTransitions:
    """Property test: publish/archive succeed only on the allowed
    (status, action) pairs; everything else is 409 with status unchanged."""

    @settings(max_examples=100, deadline=None)
    @given(
        campaign_status=st.sampled_from(STATUSES),
        action=st.sampled_from(ACTIONS),
    )
    def test_transitions_follow_allowed_table(
        self, campaign_status: str, action: str
    ) -> None:
        """
        **Validates: Requirements 3.1, 3.2, 3.3**

        For any (status, action) pair:
        - draft + publish → 200 and the campaign becomes "active"
        - active + archive → 200 and the campaign becomes "archived"
        - any other pair → 409, the detail names the invalid transition, and
          re-fetching the campaign shows its status unchanged
        """
        setup_db(campaign_status)
        expected_new_status = ALLOWED_TRANSITIONS.get((campaign_status, action))

        app.dependency_overrides[get_settings] = get_fake_settings
        try:
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

                        resp = client.post(f"/api/v1/campaigns/{CAMPAIGN_ID}/{action}")

                        if expected_new_status is not None:
                            assert resp.status_code == 200, (
                                f"Allowed transition {campaign_status} + {action} "
                                f"should succeed, got {resp.status_code}: {resp.text}"
                            )
                            assert resp.json()["status"] == expected_new_status
                        else:
                            assert resp.status_code == 409, (
                                f"Forbidden transition {campaign_status} + {action} "
                                f"should return 409, got {resp.status_code}: "
                                f"{resp.text}"
                            )
                            detail = resp.json()["detail"]
                            assert action in detail.lower()
                            assert campaign_status in detail

                        # Re-fetch to verify the persisted status (the viewer
                        # is a manager, so drafts remain retrievable).
                        refetch = client.get(f"/api/v1/campaigns/{CAMPAIGN_ID}")
                        assert refetch.status_code == 200
                        final_status = refetch.json()["status"]
                        if expected_new_status is not None:
                            assert final_status == expected_new_status, (
                                f"After {action} on a {campaign_status} campaign, "
                                f"status should be '{expected_new_status}', got "
                                f"'{final_status}'"
                            )
                        else:
                            assert final_status == campaign_status, (
                                f"Rejected {action} on a {campaign_status} campaign "
                                f"must leave the status unchanged, got "
                                f"'{final_status}'"
                            )
        finally:
            app.dependency_overrides.pop(get_settings, None)
