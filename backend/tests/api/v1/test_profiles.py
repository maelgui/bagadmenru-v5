from unittest.mock import ANY, MagicMock, patch

from fastapi.testclient import TestClient


def test_read_my_profile(client: TestClient):
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "email": "john.doe@example.com",
        "first_name": "john",
        "last_name": "doe",
        "picture_key": None,
        "picture_url": None,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "is_instrument": False,
            "name": "Piccolo",
        },
        "groups": [],
        "receives_emails": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
    }


def test_read_profile(client: TestClient):
    response = client.get("/api/v1/profiles/a8e2d3249e9d997e")
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "email": "john.doe@example.com",
        "first_name": "john",
        "last_name": "doe",
        "picture_key": ANY,
        "picture_url": ANY,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "is_instrument": False,
            "name": "Piccolo",
        },
        "groups": [],
        "receives_emails": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
    }


@patch("bbe2.utils.s3.S3Helper.set_tags")
def test_update_my_profile(mock_set_tags: MagicMock, client: TestClient):
    response = client.put(
        "/api/v1/profiles/me",
        json={
            "first_name": "john",
            "last_name": "doe2",
            "picture_key": "blbabla.jpg",
            "instrument_id": 1,
            "receives_emails": True,
        },
    )
    mock_set_tags.assert_called_once_with(
        "blbabla.jpg",
        {"user_id": "a8e2d3249e9d997e", "temp": "false"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "email": "john.doe@example.com",
        "first_name": "john",
        "last_name": "doe2",
        "picture_key": "blbabla.jpg",
        "picture_url": ANY,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "is_instrument": False,
            "name": "Piccolo",
        },
        "groups": [],
        "receives_emails": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
    }


def test_list_profiles(client: TestClient):
    response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "a8e2d3249e9d997e",
            "email": "john.doe@example.com",
            "first_name": "john",
            "last_name": "doe",
            "picture_key": None,
            "picture_url": None,
            "instrument": {
                "color": "#fff",
                "id": 1,
                "is_instrument": False,
                "name": "Piccolo",
            },
            "groups": [],
            "receives_emails": True,
            "is_active": True,
            "membership_status": None,
            "membership_active_season": None,
        }
    ]


def test_list_profiles_membership_status_hidden_without_permission(
    client: TestClient,
):
    """A caller without view:membership never sees membership_status populated."""
    with patch("bbe2.api.v1.endpoints.profiles.is_allowed", return_value=False):
        response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json()[0]["membership_status"] is None


def test_list_profiles_membership_status_shown_with_permission(client: TestClient):
    """With view:membership, each member's current-season status is included."""
    from datetime import datetime, timezone

    from bbe2 import models
    from bbe2.database import get_engine

    # Insert an active (Processed) membership for the current season.
    engine = get_engine("sqlite:///tests.sqlite?check_same_thread=false")
    from sqlalchemy.orm import Session

    with Session(engine) as session:
        session.add(
            models.HelloAssoMembershipDB(
                helloasso_order_id=1,
                helloasso_item_id=1,
                user_id="a8e2d3249e9d997e",
                tier_description="Adhésion",
                amount=1000,
                order_date=datetime.now(tz=timezone.utc),
                state="Processed",
                raw_payload={},
            )
        )
        session.commit()

    with patch("bbe2.api.v1.endpoints.profiles.is_allowed", return_value=True):
        response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json()[0]["membership_status"] == "active"
    # The active season label is exposed so the UI can show it on the badge.
    from bbe2.services import membership as membership_service

    expected_season = membership_service.season_label(datetime.now(tz=timezone.utc))
    assert response.json()[0]["membership_active_season"] == expected_season


def test_create_profile_links_orphan_membership_by_adherent_email(
    client: TestClient,
):
    """Creating a member manually attaches a matching orphan membership too.

    Mirrors the invitation signup path: an admin-created member whose email
    matches an unlinked membership's adherent email gets that adhesion linked.
    """
    from datetime import datetime, timezone

    from sqlalchemy.orm import Session

    from bbe2 import models
    from bbe2.database import get_engine
    from bbe2.main import app
    from bbe2.utils.templates import EmailSender

    # A no-op email sender so create_profile's welcome email is not actually
    # sent (no SMTP in tests).
    class _NoopSender:
        async def batch_send_emails(self, subject, template_name, template_data):
            return None

    app.dependency_overrides[EmailSender] = lambda: _NoopSender()
    try:
        engine = get_engine("sqlite:///tests.sqlite?check_same_thread=false")
        with Session(engine) as session:
            session.add(
                models.HelloAssoMembershipDB(
                    helloasso_order_id=777,
                    helloasso_item_id=7771,
                    user_id=None,
                    payer_email="parent@example.com",
                    adherent_email="new.member@example.com",
                    adherent_first_name="New",
                    adherent_last_name="Member",
                    amount=4400,
                    order_date=datetime.now(tz=timezone.utc),
                    state="Processed",
                    raw_payload={},
                )
            )
            session.commit()

        resp = client.post(
            "/api/v1/profiles/",
            json={
                "first_name": "New",
                "last_name": "Member",
                "email": "new.member@example.com",
                "instrument_id": 1,
                "group_ids": [],
                "receives_emails": True,
            },
        )
        assert resp.status_code == 200, resp.text

        # The orphan membership is now linked, so it no longer appears in the
        # admin "unlinked" list (checked through the API to use the endpoint's
        # own DB session path).
        unlinked = client.get("/api/v1/helloasso/orders/unlinked").json()
        assert all(r["helloasso_item_id"] != 7771 for r in unlinked)
    finally:
        app.dependency_overrides.pop(EmailSender, None)
