# Feature: event-campaigns, Property 3: Global Campaign Management Authorization
"""
Property 3: Global Campaign Management Authorization

For any authenticated user and any campaign management operation (create,
update, delete, publish, archive, link, unlink, and event creation with a
`campaign_id`), the operation SHALL succeed if and only if the user holds the
`campaign_manager` role in at least one of their group memberships, regardless
of which group owns the campaign. Otherwise, the API SHALL return 403.

**Validates: Requirements 1.8, 3.5, 4.4, 5.4, 6.8, 7.4, 14.3, 14.4, 14.5**
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

DATABASE_URL = "sqlite:///tests_property_authorization.sqlite?check_same_thread=false"

USER_ID = "test-user-authz"

# Seeded fixture identifiers
DRAFT_CAMPAIGN_ID = 1
ACTIVE_CAMPAIGN_ID = 2
UNLINKED_EVENT_ID = 1
LINKED_EVENT_ID = 2


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

    This isolates the campaign_manager authorization under test: the generic
    Authorization dependency (e.g. Action.CREATE on Resource.EVENT) passes for
    any authenticated user, so a 403 can only come from the campaign checks.
    """
    return True


def setup_db(scenario: dict) -> None:
    """Create the schema and seed the scenario data.

    Seeds:
    - N groups; each either holds the campaign_manager role or a plain role
    - one user, member of the groups indicated by the scenario
    - a draft campaign (target of update/delete/publish/link/unlink and
      event creation with campaign_id)
    - an active campaign (target of archive)
    - an unlinked event (target of link) and an event linked to the draft
      campaign (target of unlink); both have is_in_doodle=False so that no
      new-event notification is ever triggered (at creation or at publish)
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        session.merge(RoleDB(id="campaign_manager", description="Can manage campaigns"))
        session.merge(RoleDB(id="member", description="Regular member"))

        for i in range(scenario["num_groups"]):
            group_id = i + 1
            session.merge(GroupDB(id=group_id, name=f"Group_{group_id}", color="#fff"))
            role_id = (
                "campaign_manager"
                if scenario["group_has_campaign_manager"][i]
                else "member"
            )
            session.execute(
                group_role_association_table.insert().values(
                    group_id=group_id, role_id=role_id
                )
            )

        session.merge(
            UserDB(
                id=USER_ID,
                email="authz@example.com",
                first_name="Test",
                last_name="User",
            )
        )
        for i in range(scenario["num_groups"]):
            if scenario["user_member_of"][i]:
                session.execute(
                    user_group_association_table.insert().values(
                        profile_id=USER_ID, group_id=i + 1
                    )
                )

        session.add(
            CampaignDB(
                id=DRAFT_CAMPAIGN_ID,
                name="Draft campaign",
                group_id=1,
                status="draft",
            )
        )
        session.add(
            CampaignDB(
                id=ACTIVE_CAMPAIGN_ID,
                name="Active campaign",
                group_id=1,
                status="active",
            )
        )
        session.add(
            EventDB(
                id=UNLINKED_EVENT_ID,
                title="Unlinked event",
                description="",
                date=datetime(2030, 6, 1),
                costume=Costume.NONE,
                category="concert",
                is_in_doodle=False,
            )
        )
        session.add(
            EventDB(
                id=LINKED_EVENT_ID,
                title="Linked event",
                description="",
                date=datetime(2030, 6, 2),
                costume=Costume.NONE,
                category="concert",
                is_in_doodle=False,
                campaign_id=DRAFT_CAMPAIGN_ID,
            )
        )

        session.commit()


def expected_authorization(scenario: dict) -> bool:
    """True iff the user holds campaign_manager in at least one of their groups."""
    return any(
        scenario["user_member_of"][i] and scenario["group_has_campaign_manager"][i]
        for i in range(scenario["num_groups"])
    )


# --- Operations under test ---
#
# Each entry: (name, request callable, success status code). The order is
# state-safe for the authorized path: earlier operations do not destroy the
# preconditions of later ones (publish turns the draft campaign active before
# it is deleted last; archive targets the separately seeded active campaign).
# For the unauthorized path order is irrelevant: every request is rejected by
# the authorization check before touching any state.

EVENT_CREATE_PAYLOAD = {
    "title": "Campaign event",
    "description": "Created within a campaign",
    "date": "2030-06-03",
    "costume": "NONE",
    "category": "concert",
    "is_in_doodle": False,
    "campaign_id": DRAFT_CAMPAIGN_ID,
}

OPERATIONS = [
    (
        "create",
        lambda c: c.post(
            "/api/v1/campaigns/",
            json={"name": "New campaign", "description": "d", "group_id": 1},
        ),
        201,
    ),
    (
        "update",
        lambda c: c.patch(
            f"/api/v1/campaigns/{DRAFT_CAMPAIGN_ID}", json={"name": "Renamed"}
        ),
        200,
    ),
    (
        "event_create_with_campaign_id",
        lambda c: c.post("/api/v1/events/", json=EVENT_CREATE_PAYLOAD),
        201,
    ),
    (
        "link",
        lambda c: c.post(
            f"/api/v1/campaigns/{DRAFT_CAMPAIGN_ID}/events/{UNLINKED_EVENT_ID}"
        ),
        200,
    ),
    (
        "unlink",
        lambda c: c.delete(
            f"/api/v1/campaigns/{DRAFT_CAMPAIGN_ID}/events/{LINKED_EVENT_ID}"
        ),
        204,
    ),
    (
        "publish",
        lambda c: c.post(f"/api/v1/campaigns/{DRAFT_CAMPAIGN_ID}/publish"),
        200,
    ),
    (
        "archive",
        lambda c: c.post(f"/api/v1/campaigns/{ACTIVE_CAMPAIGN_ID}/archive"),
        200,
    ),
    (
        "delete",
        lambda c: c.delete(f"/api/v1/campaigns/{DRAFT_CAMPAIGN_ID}"),
        204,
    ),
]


# --- Strategies ---


@st.composite
def user_group_role_scenario(draw):
    """Generate a scenario of groups, their roles, and user memberships."""
    num_groups = draw(st.integers(min_value=1, max_value=4))
    group_has_campaign_manager = draw(
        st.lists(st.booleans(), min_size=num_groups, max_size=num_groups)
    )
    user_member_of = draw(
        st.lists(st.booleans(), min_size=num_groups, max_size=num_groups)
    )
    return {
        "num_groups": num_groups,
        "group_has_campaign_manager": group_has_campaign_manager,
        "user_member_of": user_member_of,
    }


# --- Property Test ---


class TestGlobalCampaignManagementAuthorization:
    """Property test: every campaign management operation succeeds iff the
    user holds campaign_manager in at least one group, else returns 403."""

    @settings(max_examples=100, deadline=None)
    @given(scenario=user_group_role_scenario())
    def test_management_operations_require_campaign_manager_role(
        self, scenario: dict
    ) -> None:
        """
        **Validates: Requirements 1.8, 3.5, 4.4, 5.4, 6.8, 7.4, 14.3, 14.4, 14.5**

        For any user/group/role combination and every campaign management
        operation (create, update, delete, publish, archive, link, unlink,
        event creation with a campaign_id):
        - the operation succeeds when the user holds campaign_manager in at
          least one of their group memberships (regardless of which group
          owns the campaign)
        - otherwise the API returns 403
        """
        setup_db(scenario)
        should_be_authorized = expected_authorization(scenario)

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

                        for name, request, success_code in OPERATIONS:
                            resp = request(client)
                            if should_be_authorized:
                                assert resp.status_code == success_code, (
                                    f"Operation '{name}' should succeed with "
                                    f"{success_code} for a campaign manager, "
                                    f"got {resp.status_code}: {resp.text}"
                                )
                            else:
                                assert resp.status_code == 403, (
                                    f"Operation '{name}' should return 403 for "
                                    f"a non-manager, got {resp.status_code}: "
                                    f"{resp.text}"
                                )
                                assert (
                                    "Insufficient permissions" in resp.json()["detail"]
                                )
        finally:
            app.dependency_overrides.pop(get_settings, None)
