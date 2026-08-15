# Feature: event-campaigns, Property 13: Publish Notification Exactness
"""
Property 13: Publish Notification Exactness

For any draft campaign with an arbitrary mix of linked events (with and
without `is_in_doodle`), publishing the campaign SHALL invoke the
Notification Service exactly once for each linked event with `is_in_doodle`,
and for no other event. When no linked event has `is_in_doodle`, no
notification SHALL be sent.

**Validates: Requirements 9.4, 9.5**
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
from bbe2.models import CampaignDB, EventDB
from bbe2.models.base import Base
from bbe2.models.user import (
    GroupDB,
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas import Costume
from bbe2.schemas.auth import JwtPayload

# --- Test configuration ---

DATABASE_URL = (
    "sqlite:///tests_property_publish_notifications.sqlite?check_same_thread=false"
)

USER_ID = "test-user-publish-notif"
GROUP_ID = 1
CAMPAIGN_ID = 1
# Unlinked control event: must never trigger a notification on publish even
# though it has is_in_doodle=True, because it is not linked to the campaign.
UNLINKED_DOODLE_EVENT_ID = 1000


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
    """Always allow the generic role check; publish is gated by the seeded
    campaign_manager membership."""
    return True


def setup_db(doodle_flags: list[bool]) -> list[int]:
    """Create the schema and seed a manager, a draft campaign, and its events.

    Seeds one linked event per entry in `doodle_flags` (with the given
    is_in_doodle value) plus one unlinked doodle event as a control.
    Returns the ids of the linked events that have is_in_doodle=True.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    doodle_event_ids: list[int] = []
    with testing_session_local() as session:
        # A group holding campaign_manager, with the user as a member.
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
                email="publish-notif@example.com",
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
                name="Draft campaign",
                group_id=GROUP_ID,
                status="draft",
            )
        )

        for i, is_in_doodle in enumerate(doodle_flags):
            event_id = i + 1
            session.add(
                EventDB(
                    id=event_id,
                    title=f"Event {event_id}",
                    description="",
                    date=datetime(2030, 6, 1) + timedelta(days=i),
                    costume=Costume.NONE,
                    category="concert",
                    is_in_doodle=is_in_doodle,
                    campaign_id=CAMPAIGN_ID,
                )
            )
            if is_in_doodle:
                doodle_event_ids.append(event_id)

        # Control: an unlinked doodle event must never be notified on publish.
        session.add(
            EventDB(
                id=UNLINKED_DOODLE_EVENT_ID,
                title="Unlinked doodle event",
                description="",
                date=datetime(2030, 7, 1),
                costume=Costume.NONE,
                category="concert",
                is_in_doodle=True,
            )
        )

        session.commit()

    return doodle_event_ids


# --- Property Test ---


class TestPublishNotificationExactness:
    """Property test: publishing a draft campaign notifies exactly once per
    is_in_doodle linked event and for no other event."""

    @settings(max_examples=100, deadline=None)
    @given(doodle_flags=st.lists(st.booleans(), min_size=0, max_size=6))
    def test_publish_notifies_exactly_once_per_doodle_linked_event(
        self, doodle_flags: list[bool]
    ) -> None:
        """
        **Validates: Requirements 9.4, 9.5**

        For any draft campaign with an arbitrary mix of linked events (with
        and without is_in_doodle), publishing the campaign invokes
        notify_new_event exactly once per is_in_doodle linked event (matched
        on event id) and never for non-doodle or unlinked events. With zero
        doodle events, no notification is sent.
        """
        expected_event_ids = setup_db(doodle_flags)

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
                    with patch(
                        "bbe2.api.v1.endpoints.campaigns.notify_new_event"
                    ) as mock_notify:
                        # TestClient runs background tasks synchronously
                        # after the response, so assertions on the mock are
                        # valid once the request returns.
                        with TestClient(app) as client:
                            client.headers = {"Authorization": f"Bearer {access_token}"}
                            resp = client.post(
                                f"/api/v1/campaigns/{CAMPAIGN_ID}/publish"
                            )
                            assert resp.status_code == 200, (
                                f"Publish should succeed, got "
                                f"{resp.status_code}: {resp.text}"
                            )

                        # Exactly one notification per doodle linked event.
                        assert mock_notify.call_count == len(expected_event_ids), (
                            f"Expected {len(expected_event_ids)} notification(s) "
                            f"for doodle flags {doodle_flags}, got "
                            f"{mock_notify.call_count}"
                        )

                        # Notified event ids match the doodle linked events
                        # exactly (event_id is the 4th positional argument of
                        # notify_new_event(sender, settings, event, event_id)).
                        notified_ids = sorted(
                            call.args[3] for call in mock_notify.call_args_list
                        )
                        assert notified_ids == sorted(expected_event_ids), (
                            f"Notified event ids {notified_ids} do not match "
                            f"expected doodle linked event ids "
                            f"{sorted(expected_event_ids)}"
                        )
        finally:
            app.dependency_overrides.pop(get_settings, None)
