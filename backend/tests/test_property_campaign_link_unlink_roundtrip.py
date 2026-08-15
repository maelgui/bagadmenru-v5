# Feature: event-campaigns, Property 10: Link/Unlink Round-Trip
"""
Property 10: Link/Unlink Round-Trip

For any valid event and campaign, after linking the event to the campaign,
retrieving the campaign SHALL include that event in its events list. After
unlinking, retrieving the campaign SHALL NOT include that event, and the event
SHALL still exist with campaign_id = NULL.

**Validates: Requirements 6.1, 6.6**
"""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st
from sqlalchemy.orm import sessionmaker

import bbe2.utils.auth
from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models import GroupDB
from bbe2.models.base import Base
from bbe2.models.user import (
    RoleDB,
    UserDB,
    group_role_association_table,
    user_group_association_table,
)
from bbe2.schemas.auth import JwtPayload

# --- Test configuration ---

DATABASE_URL = (
    "sqlite:///tests_property_link_unlink_roundtrip.sqlite?check_same_thread=false"
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


# --- Strategies ---

dates_strategy = st.dates(min_value=date(2020, 1, 1), max_value=date(2030, 12, 31))

event_category_strategy = st.sampled_from(["rehearsal", "concert", "outing", "other"])
costume_strategy = st.sampled_from(["POLO", "COSTUME", "NONE"])

event_title_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=("L", "N", "P", "Z"),
        blacklist_characters="\x00",
    ),
    min_size=1,
    max_size=80,
).filter(lambda s: s.strip())


@st.composite
def link_unlink_scenario(draw):
    """Generate a scenario with multiple events, some to link, some to later unlink.

    Returns a dict with:
    - num_events: total number of events to create (2-6)
    - events_to_link: indices of events to link to the campaign
    - events_to_unlink: subset of events_to_link to later unlink
    - event_titles: list of titles for the events
    - event_dates: list of dates for the events
    - event_categories: list of categories for the events
    - event_costumes: list of costumes for the events
    """
    num_events = draw(st.integers(min_value=2, max_value=6))

    # Generate event data
    event_titles = draw(
        st.lists(event_title_strategy, min_size=num_events, max_size=num_events)
    )
    event_dates = draw(
        st.lists(dates_strategy, min_size=num_events, max_size=num_events)
    )
    event_categories = draw(
        st.lists(event_category_strategy, min_size=num_events, max_size=num_events)
    )
    event_costumes = draw(
        st.lists(costume_strategy, min_size=num_events, max_size=num_events)
    )

    # Decide which events to link (at least 1, up to all)
    all_indices = list(range(num_events))
    num_to_link = draw(st.integers(min_value=1, max_value=num_events))
    events_to_link = sorted(
        draw(
            st.lists(
                st.sampled_from(all_indices),
                min_size=num_to_link,
                max_size=num_to_link,
                unique=True,
            )
        )
    )

    # Decide which linked events to unlink (0 to all linked)
    num_to_unlink = draw(st.integers(min_value=0, max_value=len(events_to_link)))
    events_to_unlink = (
        sorted(
            draw(
                st.lists(
                    st.sampled_from(events_to_link),
                    min_size=num_to_unlink,
                    max_size=num_to_unlink,
                    unique=True,
                )
            )
        )
        if num_to_unlink > 0
        else []
    )

    return {
        "num_events": num_events,
        "events_to_link": events_to_link,
        "events_to_unlink": events_to_unlink,
        "event_titles": event_titles,
        "event_dates": event_dates,
        "event_categories": event_categories,
        "event_costumes": event_costumes,
    }


# --- Property Test ---


class TestCampaignLinkUnlinkRoundTrip:
    """Property test: Link/Unlink Round-Trip."""

    @settings(max_examples=100, deadline=None)
    @given(scenario=link_unlink_scenario())
    def test_link_unlink_roundtrip(self, scenario: dict) -> None:
        """
        **Validates: Requirements 6.1, 6.6**

        For any valid events and campaign:
        1. After linking events to the campaign, GET campaign detail includes those events.
        2. After unlinking some events, GET campaign detail no longer includes them.
        3. Unlinked events still exist (GET /events/{id} returns 200) with campaign_id = NULL.
        """
        # Setup: fresh database for each test example
        engine = get_engine(DATABASE_URL)
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine
        )

        # Seed user with campaign_manager role
        with TestingSessionLocal() as session:
            group = GroupDB(id=1, name="TestGroup", color="#abc")
            session.merge(group)

            role = RoleDB(id="campaign_manager", description="Can manage campaigns")
            session.merge(role)

            session.execute(
                group_role_association_table.insert().values(
                    group_id=1, role_id="campaign_manager"
                )
            )

            user = UserDB(
                id="test-link-unlink-user",
                email="linkunlink@example.com",
                first_name="Link",
                last_name="Tester",
            )
            session.merge(user)

            session.execute(
                user_group_association_table.insert().values(
                    profile_id="test-link-unlink-user", group_id=1
                )
            )
            session.commit()

        # Override settings and auth
        app.dependency_overrides[get_settings] = get_fake_settings
        original_is_allowed = bbe2.utils.auth.is_allowed

        try:
            bbe2.utils.auth.is_allowed = fake_is_allowed

            payload = JwtPayload(
                sub="test-link-unlink-user",
                roles=[],
                first_name="Link",
                last_name="Tester",
                exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
                iat=datetime.now(tz=timezone.utc),
            ).model_dump()
            access_token = jwt.encode(
                payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
            )

            with patch("bbe2.main.scheduler"):
                with TestClient(app) as client:
                    client.headers = {"Authorization": f"Bearer {access_token}"}

                    # Step 1: Create a campaign
                    campaign_resp = client.post(
                        "/api/v1/campaigns/",
                        json={
                            "name": "RoundTrip Campaign",
                            "group_id": 1,
                        },
                    )
                    assert (
                        campaign_resp.status_code == 201
                    ), f"Failed to create campaign: {campaign_resp.text}"
                    campaign_id = campaign_resp.json()["id"]

                    # Step 2: Create events
                    event_ids = []
                    for i in range(scenario["num_events"]):
                        event_resp = client.post(
                            "/api/v1/events/",
                            json={
                                "title": scenario["event_titles"][i],
                                "description": f"Event {i} description",
                                "date": scenario["event_dates"][i].isoformat(),
                                "costume": scenario["event_costumes"][i],
                                "category": scenario["event_categories"][i],
                                "is_in_doodle": False,
                            },
                        )
                        assert (
                            event_resp.status_code == 201
                        ), f"Failed to create event {i}: {event_resp.text}"
                        event_ids.append(event_resp.json()["id"])

                    # Step 3: Link selected events to the campaign
                    for idx in scenario["events_to_link"]:
                        link_resp = client.post(
                            f"/api/v1/campaigns/{campaign_id}/events/{event_ids[idx]}"
                        )
                        assert (
                            link_resp.status_code == 200
                        ), f"Failed to link event {idx}: {link_resp.text}"

                    # Step 4: Verify GET campaign detail includes linked events
                    detail_resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                    assert detail_resp.status_code == 200
                    campaign_detail = detail_resp.json()

                    linked_event_ids_in_response = {
                        e["id"] for e in campaign_detail["events"]
                    }
                    expected_linked_ids = {
                        event_ids[idx] for idx in scenario["events_to_link"]
                    }
                    assert linked_event_ids_in_response == expected_linked_ids, (
                        f"After linking, campaign detail should include exactly "
                        f"the linked events. Expected: {expected_linked_ids}, "
                        f"Got: {linked_event_ids_in_response}"
                    )

                    # Step 5: Unlink selected events
                    for idx in scenario["events_to_unlink"]:
                        unlink_resp = client.delete(
                            f"/api/v1/campaigns/{campaign_id}/events/{event_ids[idx]}"
                        )
                        assert (
                            unlink_resp.status_code == 204
                        ), f"Failed to unlink event {idx}: {unlink_resp.text}"

                    # Step 6: Verify GET campaign detail no longer includes
                    # unlinked events but still includes the rest
                    detail_resp = client.get(f"/api/v1/campaigns/{campaign_id}")
                    assert detail_resp.status_code == 200
                    campaign_detail = detail_resp.json()

                    remaining_event_ids_in_response = {
                        e["id"] for e in campaign_detail["events"]
                    }
                    expected_remaining_ids = {
                        event_ids[idx]
                        for idx in scenario["events_to_link"]
                        if idx not in scenario["events_to_unlink"]
                    }
                    assert remaining_event_ids_in_response == expected_remaining_ids, (
                        f"After unlinking, campaign detail should only include "
                        f"events that were NOT unlinked. "
                        f"Expected: {expected_remaining_ids}, "
                        f"Got: {remaining_event_ids_in_response}"
                    )

                    # Step 7: Verify unlinked events still exist and have
                    # campaign_id = NULL
                    for idx in scenario["events_to_unlink"]:
                        event_resp = client.get(f"/api/v1/events/{event_ids[idx]}")
                        assert event_resp.status_code == 200, (
                            f"Unlinked event {idx} should still exist, "
                            f"got {event_resp.status_code}"
                        )
                        # The event response should not reference the campaign
                        # (campaign_id should be NULL / not present)
                        event_data = event_resp.json()
                        # If the event schema exposes campaign_id, verify it's None
                        if "campaign_id" in event_data:
                            assert event_data["campaign_id"] is None, (
                                f"Unlinked event {idx} should have "
                                f"campaign_id = NULL"
                            )

        finally:
            bbe2.utils.auth.is_allowed = original_is_allowed
            app.dependency_overrides.pop(get_settings, None)
