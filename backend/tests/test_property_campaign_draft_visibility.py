# Feature: event-campaigns, Property 5: Draft Campaign Visibility
"""
Property 5: Draft Campaign Visibility

For any set of campaigns with mixed statuses and any authenticated viewer, a
campaign SHALL appear in the campaign list and be retrievable by ID if and
only if its status is not "draft" or the viewer is a Campaign_Manager. A
non-manager requesting a draft campaign by ID SHALL receive 404.

**Validates: Requirements 2.2, 2.3, 2.5, 14.1, 14.2**
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
    "sqlite:///tests_property_draft_visibility.sqlite?check_same_thread=false"
)

MANAGER_USER_ID = "test-user-manager"
NON_MANAGER_USER_ID = "test-user-member"

STATUSES = ["draft", "active", "archived"]


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
    """Always allow the generic role check in tests.

    This isolates draft visibility filtering under test: the generic
    Authorization dependency passes for any authenticated user, so any
    exclusion or 404 can only come from the draft visibility rule.
    """
    return True


def setup_db_with_campaigns(statuses: list[str]) -> None:
    """Create the schema and seed users plus one campaign per status value.

    Seeds:
    - group 1 holding the campaign_manager role, with the manager user
    - group 2 holding a plain member role, with the non-manager user
    - one campaign per entry in `statuses` (ids are 1..N in order)
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(RoleDB(id="campaign_manager", description="Can manage campaigns"))
        session.merge(RoleDB(id="member", description="Regular member"))

        session.merge(GroupDB(id=1, name="Managers", color="#111111"))
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        session.merge(GroupDB(id=2, name="Members", color="#222222"))
        session.execute(
            group_role_association_table.insert().values(group_id=2, role_id="member")
        )

        session.merge(
            UserDB(
                id=MANAGER_USER_ID,
                email="manager@example.com",
                first_name="Manager",
                last_name="User",
            )
        )
        session.execute(
            user_group_association_table.insert().values(
                profile_id=MANAGER_USER_ID, group_id=1
            )
        )
        session.merge(
            UserDB(
                id=NON_MANAGER_USER_ID,
                email="member@example.com",
                first_name="Member",
                last_name="User",
            )
        )
        session.execute(
            user_group_association_table.insert().values(
                profile_id=NON_MANAGER_USER_ID, group_id=2
            )
        )

        for i, campaign_status in enumerate(statuses):
            session.add(
                CampaignDB(
                    id=i + 1,
                    name=f"Campaign {i + 1}",
                    group_id=1,
                    status=campaign_status,
                )
            )

        session.commit()


# --- Strategies ---


@st.composite
def visibility_scenario(draw):
    """Generate a mix of campaign statuses and the viewer's role."""
    statuses = draw(st.lists(st.sampled_from(STATUSES), min_size=1, max_size=8))
    viewer_is_manager = draw(st.booleans())
    return {"statuses": statuses, "viewer_is_manager": viewer_is_manager}


# --- Property Test ---


class TestDraftCampaignVisibility:
    """Property test: a campaign is listed and retrievable by ID iff its
    status is not draft or the viewer is a campaign manager."""

    @settings(max_examples=100, deadline=None)
    @given(scenario=visibility_scenario())
    def test_campaign_visible_iff_not_draft_or_viewer_is_manager(
        self, scenario: dict
    ) -> None:
        """
        **Validates: Requirements 2.2, 2.3, 2.5, 14.1, 14.2**

        For any set of campaigns with mixed statuses (draft/active/archived)
        and either a manager or a non-manager viewer:
        - the campaign list contains exactly the campaigns whose status is
          not "draft", plus all drafts when the viewer is a manager
        - GET /campaigns/{id} returns 200 for visible campaigns and 404
          (not 403) for drafts requested by a non-manager
        """
        statuses = scenario["statuses"]
        viewer_is_manager = scenario["viewer_is_manager"]

        setup_db_with_campaigns(statuses)

        app.dependency_overrides[get_settings] = get_fake_settings
        try:
            user_id = MANAGER_USER_ID if viewer_is_manager else NON_MANAGER_USER_ID
            payload = JwtPayload(
                sub=user_id,
                roles=[],
                first_name="Test",
                last_name="User",
                exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
                iat=datetime.now(tz=timezone.utc),
            ).model_dump()
            access_token = jwt.encode(
                payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
            )

            expected_visible_ids = {
                i + 1
                for i, campaign_status in enumerate(statuses)
                if campaign_status != "draft" or viewer_is_manager
            }

            with patch("bbe2.utils.auth.is_allowed", fake_is_allowed):
                with patch("bbe2.main.scheduler"):
                    with TestClient(app) as client:
                        client.headers = {"Authorization": f"Bearer {access_token}"}

                        # List membership matches the visibility rule exactly
                        resp = client.get("/api/v1/campaigns/")
                        assert resp.status_code == 200
                        listed_ids = {c["id"] for c in resp.json()}
                        assert listed_ids == expected_visible_ids, (
                            f"List mismatch for manager={viewer_is_manager}, "
                            f"statuses={statuses}. Expected "
                            f"{expected_visible_ids}, got {listed_ids}"
                        )

                        # Detail retrievability matches the same rule
                        for i, campaign_status in enumerate(statuses):
                            campaign_id = i + 1
                            resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                            if campaign_id in expected_visible_ids:
                                assert resp.status_code == 200, (
                                    f"Campaign {campaign_id} "
                                    f"(status={campaign_status}) should be "
                                    f"retrievable for manager="
                                    f"{viewer_is_manager}, got "
                                    f"{resp.status_code}: {resp.text}"
                                )
                                assert resp.json()["id"] == campaign_id
                            else:
                                # Draft + non-manager: 404, never 403, to
                                # avoid leaking the draft's existence
                                assert resp.status_code == 404, (
                                    f"Draft campaign {campaign_id} should "
                                    f"return 404 for a non-manager, got "
                                    f"{resp.status_code}: {resp.text}"
                                )
        finally:
            app.dependency_overrides.pop(get_settings, None)
