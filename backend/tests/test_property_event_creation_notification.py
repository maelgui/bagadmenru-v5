# Feature: event-campaigns, Property 12: Creation-Time Notification Rule
"""
Property 12: Creation-Time Notification Rule

For any event creation payload with any `is_in_doodle` value and any campaign
linkage (none, draft campaign, or active campaign), the Notification Service
SHALL be invoked at creation time if and only if `is_in_doodle` is true and
the event is not linked to a draft campaign.

**Validates: Requirements 9.1, 9.2, 9.3**
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
    "sqlite:///tests_property_creation_notification.sqlite?check_same_thread=false"
)

USER_ID = "test-user-creation-notif"
GROUP_ID = 1

# Seeded fixture identifiers
DRAFT_CAMPAIGN_ID = 1
ACTIVE_CAMPAIGN_ID = 2

LINKAGE_TO_CAMPAIGN_ID = {
    "none": None,
    "draft": DRAFT_CAMPAIGN_ID,
    "active": ACTIVE_CAMPAIGN_ID,
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
    """Always allow the generic role check: the notification rule is under test."""
    return True


def setup_db() -> None:
    """Create the schema and seed the fixtures.

    Seeds a campaign_manager user (so every linkage variant is permitted at
    creation), a draft campaign, and an active campaign.
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
                email="notif@example.com",
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
                id=DRAFT_CAMPAIGN_ID,
                name="Draft campaign",
                group_id=GROUP_ID,
                status="draft",
            )
        )
        session.add(
            CampaignDB(
                id=ACTIVE_CAMPAIGN_ID,
                name="Active campaign",
                group_id=GROUP_ID,
                status="active",
            )
        )
        session.commit()


# --- Property Test ---


class TestCreationTimeNotificationRule:
    """Property test: notify_new_event is invoked at event creation iff
    is_in_doodle is true and the event is not linked to a draft campaign."""

    @settings(max_examples=100, deadline=None)
    @given(
        is_in_doodle=st.booleans(),
        linkage=st.sampled_from(["none", "draft", "active"]),
    )
    def test_notification_invoked_iff_doodle_and_not_draft_linked(
        self, is_in_doodle: bool, linkage: str
    ) -> None:
        """
        **Validates: Requirements 9.1, 9.2, 9.3**

        For any is_in_doodle value and any campaign linkage (none, draft,
        active), creating the event invokes the Notification Service if and
        only if is_in_doodle is true and the event is not linked to a draft
        campaign.
        """
        setup_db()

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

            event_payload = {
                "title": "Notification rule event",
                "description": "Property 12 test",
                "date": "2030-06-01",
                "costume": "NONE",
                "category": "concert",
                "is_in_doodle": is_in_doodle,
            }
            campaign_id = LINKAGE_TO_CAMPAIGN_ID[linkage]
            if campaign_id is not None:
                event_payload["campaign_id"] = campaign_id

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with patch(
                        "bbe2.api.v1.endpoints.events.notify_new_event"
                    ) as mock_notify:
                        with TestClient(app) as client:
                            client.headers = {"Authorization": f"Bearer {access_token}"}
                            # TestClient runs background tasks synchronously
                            # after the response is produced.
                            resp = client.post("/api/v1/events/", json=event_payload)

                        assert resp.status_code == 201, (
                            f"Event creation should succeed, got "
                            f"{resp.status_code}: {resp.text}"
                        )

                        should_notify = is_in_doodle and linkage != "draft"
                        if should_notify:
                            assert mock_notify.call_count == 1, (
                                f"notify_new_event should be invoked exactly "
                                f"once (is_in_doodle={is_in_doodle}, "
                                f"linkage={linkage}), got "
                                f"{mock_notify.call_count} calls"
                            )
                        else:
                            assert mock_notify.call_count == 0, (
                                f"notify_new_event should not be invoked "
                                f"(is_in_doodle={is_in_doodle}, "
                                f"linkage={linkage}), got "
                                f"{mock_notify.call_count} calls"
                            )
        finally:
            app.dependency_overrides.pop(get_settings, None)
