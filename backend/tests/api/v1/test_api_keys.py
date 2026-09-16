"""Tests for per-member API keys and API-key authentication.

Covers key lifecycle (create/list/revoke) and the two-layer model: an API key
authenticates a member (via ``X-API-Key`` header or ``api_key`` query param) and
carries a subset of that member's RBAC permissions; a request is authorized only
if the member's roles allow it AND the key lists the permission. The public ICS
feed stays unauthenticated.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import bbe2.api.v1.endpoints.profiles as profiles_module
from bbe2.database import get_engine

# Must match DATABASE_URL / seeded user in tests/conftest.py
DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"

# Permission the ICS feed requires (view:calendar). conftest patches is_allowed
# to always return True, so the member "holds" any permission; the key's own
# authorized_permissions are what these tests exercise.
CALENDAR_PERMISSION = "view:calendar"
EVENT_PERMISSION = "view:event"

# The subset validation on key creation compares against the member's own
# permissions (get_permissions_for_roles). The test JWT has empty roles, so we
# patch it to a realistic member permission set for the creation tests.
MEMBER_PERMISSIONS = [CALENDAR_PERMISSION, EVENT_PERMISSION, "view:profile"]


def _grant_member_permissions(monkeypatch, permissions=MEMBER_PERMISSIONS) -> None:
    monkeypatch.setattr(
        profiles_module, "get_permissions_for_roles", lambda _roles: list(permissions)
    )


def _make_api_key(permissions, user_id: str = SEEDED_USER_ID) -> str:
    """Create a real API key row in the test DB and return the raw secret."""
    from bbe2.utils.api_key import create_api_key

    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        raw, _ = create_api_key(session, user_id, "test key", permissions)
        session.commit()
    return raw


def _anon(client: TestClient) -> TestClient:
    """A copy of the test client with the default Bearer auth stripped."""
    client.headers.pop("Authorization", None)
    return client


# --- Key management -------------------------------------------------------


def test_create_api_key_returns_secret_once(client: TestClient, monkeypatch):
    _grant_member_permissions(monkeypatch)
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "iPhone", "authorized_permissions": [CALENDAR_PERMISSION]},
    )
    assert response.status_code == 201
    body = response.json()
    # The raw secret is returned exactly once, and looks like a bmr_ key.
    assert body["key"].startswith("bmr_")
    assert body["label"] == "iPhone"
    assert body["authorized_permissions"] == [CALENDAR_PERMISSION]
    # The prefix is a non-secret display fragment of the key.
    assert body["key"].startswith(body["prefix"])

    # It then shows up in the list, without the raw secret.
    listed = client.get("/api/v1/profiles/me/api-keys").json()
    assert len(listed) == 1
    assert "key" not in listed[0]
    assert listed[0]["prefix"] == body["prefix"]


def test_create_api_key_rejects_permission_not_held(client: TestClient, monkeypatch):
    # The member holds MEMBER_PERMISSIONS; "delete:profile" is not among them,
    # so a key requesting it must be rejected (a key cannot widen rights).
    _grant_member_permissions(monkeypatch)
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "bad", "authorized_permissions": ["delete:profile"]},
    )
    assert response.status_code == 422


def test_create_api_key_requires_at_least_one_permission(
    client: TestClient, monkeypatch
):
    _grant_member_permissions(monkeypatch)
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "empty", "authorized_permissions": []},
    )
    assert response.status_code == 422


def test_api_key_auto_generated_flag_defaults_false_and_round_trips(
    client: TestClient, monkeypatch
):
    _grant_member_permissions(monkeypatch)
    # Omitted -> manual key (auto_generated false), e.g. settings page.
    manual = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "manuelle", "authorized_permissions": [CALENDAR_PERMISSION]},
    ).json()
    assert manual["auto_generated"] is False

    # Declared true -> auto-minted key, e.g. the calendar-sync dialog.
    auto = client.post(
        "/api/v1/profiles/me/api-keys",
        json={
            "label": "Calendrier",
            "authorized_permissions": [CALENDAR_PERMISSION],
            "auto_generated": True,
        },
    ).json()
    assert auto["auto_generated"] is True

    # The flag round-trips through the listing.
    listed = {k["key_hash"]: k for k in client.get("/api/v1/profiles/me/api-keys").json()}
    assert listed[manual["key_hash"]]["auto_generated"] is False
    assert listed[auto["key_hash"]]["auto_generated"] is True


def test_revoke_api_key(client: TestClient, monkeypatch):
    _grant_member_permissions(monkeypatch)
    created = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "temp", "authorized_permissions": [CALENDAR_PERMISSION]},
    ).json()
    key_hash = created["key_hash"]

    resp = client.delete(f"/api/v1/profiles/me/api-keys/{key_hash}")
    assert resp.status_code == 204

    # Gone from the list...
    assert client.get("/api/v1/profiles/me/api-keys").json() == []
    # ...and revoking again is a 404.
    assert client.delete(f"/api/v1/profiles/me/api-keys/{key_hash}").status_code == 404


# --- Authentication via API key ------------------------------------------


def test_ics_me_with_api_key_query_param(client: TestClient):
    raw = _make_api_key([CALENDAR_PERMISSION])
    anon = _anon(client)
    response = anon.get(f"/api/v1/events/export/ics/me?api_key={raw}")
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]


def test_ics_me_with_api_key_header(client: TestClient):
    raw = _make_api_key([CALENDAR_PERMISSION])
    anon = _anon(client)
    response = anon.get("/api/v1/events/export/ics/me", headers={"X-API-Key": raw})
    assert response.status_code == 200


def test_api_key_rejected_for_permission_not_granted(client: TestClient):
    # Key grants only view:event, but the ICS feed requires view:calendar.
    raw = _make_api_key([EVENT_PERMISSION])
    anon = _anon(client)
    response = anon.get(f"/api/v1/events/export/ics/me?api_key={raw}")
    assert response.status_code == 403


def test_invalid_api_key_is_rejected(client: TestClient):
    anon = _anon(client)
    response = anon.get("/api/v1/events/export/ics/me?api_key=bmr_not_a_valid_key")
    assert response.status_code == 401


def test_public_ics_needs_no_auth(client: TestClient):
    anon = _anon(client)
    response = anon.get("/api/v1/events/export/ics")
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]
