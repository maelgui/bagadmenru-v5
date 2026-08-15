# Feature: event-campaigns, Property 11: Draft Event Visibility
"""
Property 11: Draft Event Visibility

For any event (unlinked, or linked to a campaign of any status) and any
authenticated viewer, the Event API SHALL hide the event (excluded from the
event list; 404 on detail) iff the event is linked to a campaign with status
"draft" and the viewer is not a campaign manager. Events of active/archived
campaigns and unlinked events SHALL be visible to all users; publishing a
draft campaign SHALL make all its linked events visible; unlinking an event
from a draft campaign SHALL make it visible.

**Validates: Requirements 6.7, 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 14.1, 14.2**
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
    "sqlite:///tests_property_event_draft_visibility.sqlite?check_same_thread=false"
)

MANAGER_ID = "test-user-manager"
NON_MANAGER_ID = "test-user-member"

# Seeded campaigns: two drafts (one is published mid-test, the other is the
# unlink target), one active, one archived.
DRAFT_A_ID = 1
DRAFT_B_ID = 2
ACTIVE_ID = 3
ARCHIVED_ID = 4

CAMPAIGN_STATUSES = {
    DRAFT_A_ID: "draft",
    DRAFT_B_ID: "draft",
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
    """Always allow the generic role check: visibility is what is under test."""
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
    - group 1 holding the campaign_manager role, group 2 holding a plain role
    - a manager user (member of group 1) and a non-manager user (group 2)
    - four campaigns: two drafts, one active, one archived
    - one event per linkage entry (None = unlinked, else the campaign id);
      all events have is_in_doodle=False so publishing never fans out
      notifications
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(RoleDB(id="campaign_manager", description="Can manage campaigns"))
        session.merge(RoleDB(id="member", description="Regular member"))

        session.merge(GroupDB(id=1, name="Managers", color="#fff"))
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        session.merge(GroupDB(id=2, name="Members", color="#fff"))
        session.execute(
            group_role_association_table.insert().values(group_id=2, role_id="member")
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
        session.merge(
            UserDB(
                id=NON_MANAGER_ID,
                email="member@example.com",
                first_name="Member",
                last_name="User",
            )
        )
        session.execute(
            user_group_association_table.insert().values(
                profile_id=NON_MANAGER_ID, group_id=2
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


def is_visible(
    campaign_id: Optional[int], statuses: dict[int, str], is_manager: bool
) -> bool:
    """The visibility rule under test: hidden iff linked to a draft campaign
    and the viewer is not a campaign manager."""
    if campaign_id is None:
        return True
    return is_manager or statuses[campaign_id] != "draft"


def assert_visibility(
    client: TestClient,
    token: str,
    linkage: dict[int, Optional[int]],
    statuses: dict[int, str],
    is_manager: bool,
    context: str,
) -> None:
    """Assert list membership and detail status match the visibility rule."""
    headers = {"Authorization": f"Bearer {token}"}
    viewer = "manager" if is_manager else "non-manager"

    expected_visible = {
        event_id
        for event_id, campaign_id in linkage.items()
        if is_visible(campaign_id, statuses, is_manager)
    }

    resp = client.get(f"/api/v1/events/?limit={LIST_LIMIT}", headers=headers)
    assert resp.status_code == 200, resp.text
    listed = {event["id"] for event in resp.json()}
    assert listed == expected_visible, (
        f"[{context}] {viewer} list mismatch: expected {sorted(expected_visible)}, "
        f"got {sorted(listed)} (linkage={linkage}, statuses={statuses})"
    )

    for event_id, campaign_id in linkage.items():
        resp = client.get(f"/api/v1/events/{event_id}", headers=headers)
        if is_visible(campaign_id, statuses, is_manager):
            assert resp.status_code == 200, (
                f"[{context}] {viewer} detail on event {event_id} "
                f"(campaign={campaign_id}) should be 200, "
                f"got {resp.status_code}: {resp.text}"
            )
        else:
            assert resp.status_code == 404, (
                f"[{context}] {viewer} detail on event {event_id} "
                f"(campaign={campaign_id}) should be 404, "
                f"got {resp.status_code}: {resp.text}"
            )


# --- Property Test ---


class TestDraftEventVisibility:
    """Property test: an event is hidden iff it is linked to a draft campaign
    and the viewer is not a campaign manager; publish and unlink lift the
    hiding."""

    @settings(max_examples=100, deadline=None)
    @given(
        linkages=st.lists(
            st.sampled_from([None, DRAFT_A_ID, DRAFT_B_ID, ACTIVE_ID, ARCHIVED_ID]),
            min_size=1,
            max_size=8,
        )
    )
    def test_event_hidden_iff_draft_linked_and_viewer_not_manager(
        self, linkages: list[Optional[int]]
    ) -> None:
        """
        **Validates: Requirements 6.7, 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 14.1, 14.2**

        For events across all linkage states (unlinked, draft, active,
        archived campaign) and both viewer roles:
        - list membership (GET /events/) and detail status (200 vs 404) match
          the rule: hidden iff draft-linked and viewer is not a manager
        - publishing a draft campaign makes all its linked events visible
        - unlinking an event from a draft campaign makes it visible
        """
        setup_db(linkages)

        # Mutable views of the world, updated as the sequence progresses
        linkage = {i + 1: campaign_id for i, campaign_id in enumerate(linkages)}
        statuses = dict(CAMPAIGN_STATUSES)

        app.dependency_overrides[get_settings] = get_fake_settings
        try:
            manager_token = make_token(MANAGER_ID)
            non_manager_token = make_token(NON_MANAGER_ID)

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with TestClient(app) as client:
                        manager_headers = {"Authorization": f"Bearer {manager_token}"}

                        # 1. Baseline: both viewers see exactly what the rule allows
                        assert_visibility(
                            client, manager_token, linkage, statuses, True, "baseline"
                        )
                        assert_visibility(
                            client,
                            non_manager_token,
                            linkage,
                            statuses,
                            False,
                            "baseline",
                        )

                        # 2. Publish draft A as manager: its events become
                        # visible to the non-manager; draft B events stay hidden
                        resp = client.post(
                            f"/api/v1/campaigns/{DRAFT_A_ID}/publish",
                            headers=manager_headers,
                        )
                        assert resp.status_code == 200, resp.text
                        statuses[DRAFT_A_ID] = "active"

                        assert_visibility(
                            client,
                            non_manager_token,
                            linkage,
                            statuses,
                            False,
                            "after publish",
                        )

                        # 3. Unlink one event from draft B as manager: that
                        # event becomes visible; other draft B events stay hidden
                        draft_b_events = [
                            event_id
                            for event_id, campaign_id in linkage.items()
                            if campaign_id == DRAFT_B_ID
                        ]
                        if draft_b_events:
                            unlinked_id = draft_b_events[0]
                            resp = client.delete(
                                f"/api/v1/campaigns/{DRAFT_B_ID}/events/{unlinked_id}",
                                headers=manager_headers,
                            )
                            assert resp.status_code == 204, resp.text
                            linkage[unlinked_id] = None

                            assert_visibility(
                                client,
                                non_manager_token,
                                linkage,
                                statuses,
                                False,
                                "after unlink",
                            )
        finally:
            app.dependency_overrides.pop(get_settings, None)
