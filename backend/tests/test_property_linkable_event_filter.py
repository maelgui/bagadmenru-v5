# Feature: event-campaigns, Property 15: Linkable Event Filter
"""
Property 15: Linkable Event Filter

For any set of events with random linkage states (unlinked, or linked to
campaigns of any status), GET /events/?linkable=true SHALL return exactly
the events with campaign_id IS NULL.

**Validates: Requirements 12.1**
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
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
    "sqlite:///tests_property_linkable_event_filter.sqlite?check_same_thread=false"
)

MANAGER_ID = "test-user-manager"

# Seeded campaigns: one per status, so linked events cover every linkage state
DRAFT_ID = 1
ACTIVE_ID = 2
ARCHIVED_ID = 3

CAMPAIGN_STATUSES = {
    DRAFT_ID: "draft",
    ACTIVE_ID: "active",
    ARCHIVED_ID: "archived",
}

# Large enough to always return every seeded event (list_events defaults to 10)
LIST_LIMIT = 1000


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
    """Always allow the generic role check: the linkable filter is under test."""
    return True


def make_token(user_id: str) -> str:
    payload = JwtPayload(
        sub=user_id,
        roles=[],
        first_name="Test",
        last_name="User",
        exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    return jwt.encode(payload, get_fake_settings().jwt_secret_key, algorithm="HS256")


def setup_db(linkages: list[Optional[int]]) -> None:
    """Create the schema and seed the scenario data.

    Seeds:
    - group 1 holding the campaign_manager role and a manager user in it
      (requesting as a manager keeps draft visibility out of the picture,
      so the linkable filter is tested in isolation)
    - three campaigns: one draft, one active, one archived
    - one event per linkage entry (None = unlinked, else the campaign id);
      all events have is_in_doodle=False
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(RoleDB(id="campaign_manager", description="Can manage campaigns"))
        session.merge(GroupDB(id=1, name="Managers", color="#fff"))
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        session.merge(
            UserDB(
                id=MANAGER_ID,
                email="manager@example.com",
                first_name="Manager",
                last_name="User",
            )
        )
        session.execute(
            user_group_association_table.insert().values(
                profile_id=MANAGER_ID, group_id=1
            )
        )

        for campaign_id, campaign_status in CAMPAIGN_STATUSES.items():
            session.add(
                CampaignDB(
                    id=campaign_id,
                    name=f"Campaign {campaign_id}",
                    group_id=1,
                    status=campaign_status,
                )
            )

        for i, campaign_id in enumerate(linkages):
            session.add(
                EventDB(
                    id=i + 1,
                    title=f"Event {i + 1}",
                    description="",
                    date=datetime(2030, 1, 1) + timedelta(days=i),
                    costume=Costume.NONE,
                    category="concert",
                    is_in_doodle=False,
                    campaign_id=campaign_id,
                )
            )

        session.commit()


# --- Property Test ---


class TestLinkableEventFilter:
    """Property test: GET /events/?linkable=true returns exactly the events
    with campaign_id IS NULL."""

    @settings(max_examples=100, deadline=None)
    @given(
        linkages=st.lists(
            st.sampled_from([None, DRAFT_ID, ACTIVE_ID, ARCHIVED_ID]),
            min_size=1,
            max_size=8,
        )
    )
    def test_linkable_filter_returns_exactly_unlinked_events(
        self, linkages: list[Optional[int]]
    ) -> None:
        """
        **Validates: Requirements 12.1**

        For events across all linkage states (unlinked, or linked to a
        draft/active/archived campaign), GET /events/?linkable=true returns
        exactly the set of events with campaign_id IS NULL.
        """
        setup_db(linkages)

        expected_linkable = {
            i + 1 for i, campaign_id in enumerate(linkages) if campaign_id is None
        }

        app.dependency_overrides[get_settings] = get_fake_settings
        try:
            token = make_token(MANAGER_ID)
            headers = {"Authorization": f"Bearer {token}"}

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with TestClient(app) as client:
                        resp = client.get(
                            f"/api/v1/events/?linkable=true&limit={LIST_LIMIT}",
                            headers=headers,
                        )
                        assert resp.status_code == 200, resp.text
                        listed = {event["id"] for event in resp.json()}
                        assert listed == expected_linkable, (
                            f"linkable filter mismatch: expected "
                            f"{sorted(expected_linkable)}, got {sorted(listed)} "
                            f"(linkages={linkages})"
                        )
        finally:
            app.dependency_overrides.pop(get_settings, None)
