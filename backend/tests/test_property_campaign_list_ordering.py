# Feature: event-campaigns, Property 4: Campaign List Ordering
"""
Property 4: Campaign List Ordering

For any set of campaigns in the database, the list endpoint SHALL return the
campaigns visible to the requester in descending order of created_at.

**Validates: Requirements 2.1, 10.3**
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

DATABASE_URL = "sqlite:///tests_property_ordering.sqlite?check_same_thread=false"


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


def setup_db_with_campaigns(created_ats: list[datetime]) -> None:
    """Create the schema, a campaign-manager user, and one campaign per
    created_at value (inserted in generation order, which is random).

    Campaigns keep their default "draft" status, so the requesting user must
    be a campaign manager to see them in the list (draft visibility rule).
    created_at is set directly on the rows: the API always stamps now(), so
    varying timestamps require direct DB inserts.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with testing_session_local() as session:
        # Group for campaign ownership
        group = GroupDB(id=1, name="TestGroup", color="#123456")
        session.merge(group)

        # campaign_manager role assigned to the group, user in the group
        role = RoleDB(id="campaign_manager", description="Can manage campaigns")
        session.merge(role)
        session.execute(
            group_role_association_table.insert().values(
                group_id=1, role_id="campaign_manager"
            )
        )
        user = UserDB(
            id="test-user-ordering",
            email="ordering@example.com",
            first_name="Test",
            last_name="User",
        )
        session.merge(user)
        session.execute(
            user_group_association_table.insert().values(
                profile_id="test-user-ordering", group_id=1
            )
        )

        # Campaigns with explicitly varied created_at timestamps
        for i, created_at in enumerate(created_ats):
            session.add(
                CampaignDB(
                    name=f"Campaign {i}",
                    group_id=1,
                    created_at=created_at,
                )
            )

        session.commit()


# --- Strategies ---

# Naive datetimes (matching the DB column) within a reasonable range
datetimes_strategy = st.datetimes(
    min_value=datetime(2000, 1, 1),
    max_value=datetime(2100, 12, 31),
)


@st.composite
def campaign_created_ats(draw):
    """Generate a list of 2-10 created_at timestamps for campaigns."""
    num_campaigns = draw(st.integers(min_value=2, max_value=10))
    return draw(
        st.lists(datetimes_strategy, min_size=num_campaigns, max_size=num_campaigns)
    )


# --- Property Test ---


class TestCampaignListOrdering:
    """Property test: list endpoint returns campaigns ordered by created_at desc."""

    @settings(max_examples=100, deadline=None)
    @given(created_ats=campaign_created_ats())
    def test_list_returns_campaigns_in_descending_created_at_order(
        self, created_ats: list[datetime]
    ) -> None:
        """
        **Validates: Requirements 2.1, 10.3**

        For any set of campaigns with varying created_at timestamps, the
        GET /campaigns endpoint SHALL return the campaigns visible to the
        requester ordered by created_at descending, regardless of insertion
        order.
        """
        # Setup: fresh database for each test example
        setup_db_with_campaigns(created_ats)

        # Override settings and auth
        app.dependency_overrides[get_settings] = get_fake_settings

        try:
            # JWT for the seeded campaign-manager user (drafts are only
            # visible to campaign managers)
            payload = JwtPayload(
                sub="test-user-ordering",
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

                        resp = client.get("/api/v1/campaigns/")
                        assert resp.status_code == 200

                        campaigns = resp.json()
                        assert len(campaigns) == len(created_ats)

                        returned_created_ats = [
                            datetime.fromisoformat(c["created_at"]) for c in campaigns
                        ]

                        # All seeded timestamps are returned (as a multiset)
                        assert sorted(returned_created_ats) == sorted(created_ats)

                        # Ordering: created_at values in descending order
                        assert returned_created_ats == sorted(
                            returned_created_ats, reverse=True
                        ), (
                            f"Campaigns not in descending created_at order. "
                            f"Got: {returned_created_ats}"
                        )
        finally:
            app.dependency_overrides.pop(get_settings, None)
