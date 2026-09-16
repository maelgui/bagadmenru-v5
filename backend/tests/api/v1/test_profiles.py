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
        "receives_push": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
        # Populated on /me only; True or False depending on which tests
        # seeded/cleared the shared DB's password before this one.
        "has_password": ANY,
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
        "receives_push": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
        "has_password": None,
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
            "receives_push": True,
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
        "receives_push": True,
        "is_active": True,
        "membership_status": None,
        "membership_active_season": None,
        "has_password": None,
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
            "receives_push": True,
            "is_active": True,
            "membership_status": None,
            "membership_active_season": None,
            "has_password": None,
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


def test_create_profile_defaults_notification_switches_to_true(client: TestClient):
    """A creation payload omitting the notification switches still succeeds.

    The switches default to True (mirroring the DB column defaults) so a
    client that drops undefined values from its JSON payload does not 422.
    Update payloads keep the fields required -- a partial PUT must never
    silently flip an existing member's preference.
    """
    from bbe2.main import app
    from bbe2.utils.templates import EmailSender

    class _NoopSender:
        async def batch_send_emails(self, subject, template_name, template_data):
            return None

    app.dependency_overrides[EmailSender] = lambda: _NoopSender()
    try:
        resp = client.post(
            "/api/v1/profiles/",
            json={
                "first_name": "Default",
                "last_name": "Switches",
                "email": "default.switches@example.com",
                "instrument_id": 1,
                "group_ids": [],
            },
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["receives_emails"] is True
        assert resp.json()["receives_push"] is True
    finally:
        app.dependency_overrides.pop(EmailSender, None)


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
                "receives_push": True,
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


def test_create_profile_welcome_token_uses_invitation_validity(client: TestClient):
    """The welcome email's reset link reuses the invitation validity window.

    The 1-hour ResetPassword default fits a just-requested reset, not an
    onboarding email: a new member opening their welcome email the next day
    must not land on a dead link.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from bbe2.database import get_engine
    from bbe2.main import app
    from bbe2.models.action_token import ActionTokenDB, ActionTokenValue
    from bbe2.utils.templates import EmailSender

    class _NoopSender:
        async def batch_send_emails(self, subject, template_name, template_data):
            return None

    app.dependency_overrides[EmailSender] = lambda: _NoopSender()
    try:
        resp = client.post(
            "/api/v1/profiles/",
            json={
                "first_name": "Welcome",
                "last_name": "Token",
                "email": "welcome.token@example.com",
                "instrument_id": 1,
                "group_ids": [],
                "receives_emails": True,
                "receives_push": True,
            },
        )
        assert resp.status_code == 200, resp.text
        user_id = resp.json()["id"]

        engine = get_engine("sqlite:///tests.sqlite?check_same_thread=false")
        with Session(engine) as session:
            rows = session.scalars(
                select(ActionTokenDB).where(
                    ActionTokenDB.token_type == ActionTokenValue.Recovery.value
                )
            ).all()
            row = next(r for r in rows if r.payload.get("user_id") == user_id)
            validity = (row.expires_at - row.created_at).total_seconds()
            assert validity == ActionTokenValue.Invitation.max_age
            # The welcome link is grant+code prefilled in a URL: without the
            # code half the emailed link could never sign the member in.
            assert row.payload.get("code_hash")
    finally:
        app.dependency_overrides.pop(EmailSender, None)
