"""Tests for per-member API keys and API-key authentication.

Covers key lifecycle (create/list/revoke) and the two-layer model: an API key
authenticates a member (via ``X-API-Key`` header or ``api_key`` query param) and
may only reach operations listed in its ``authorized_operations``; the usual
RBAC authorization still runs on top. The public ICS feed stays unauthenticated.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2.database import get_engine
from bbe2.utils.api_operations import EXPORT_ICS_ME

# Must match DATABASE_URL / seeded user in tests/conftest.py
DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"


def _make_api_key(operations, user_id: str = SEEDED_USER_ID) -> str:
    """Create a real API key row in the test DB and return the raw secret."""
    from bbe2.utils.api_key import create_api_key

    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_local() as session:
        raw, _ = create_api_key(session, user_id, "test key", operations)
        session.commit()
    return raw


def _anon(client: TestClient) -> TestClient:
    """A copy of the test client with the default Bearer auth stripped."""
    client.headers.pop("Authorization", None)
    return client


# --- Key management -------------------------------------------------------


def test_list_available_operations(client: TestClient):
    response = client.get("/api/v1/profiles/me/api-keys/available-operations")
    assert response.status_code == 200
    body = response.json()
    assert EXPORT_ICS_ME in body


def test_create_api_key_returns_secret_once(client: TestClient):
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "iPhone", "authorized_operations": [EXPORT_ICS_ME]},
    )
    assert response.status_code == 201
    body = response.json()
    # The raw secret is returned exactly once, and looks like a bmr_ key.
    assert body["key"].startswith("bmr_")
    assert body["label"] == "iPhone"
    assert body["authorized_operations"] == [EXPORT_ICS_ME]
    # The prefix is a non-secret display fragment of the key.
    assert body["key"].startswith(body["prefix"])

    # It then shows up in the list, without the raw secret.
    listed = client.get("/api/v1/profiles/me/api-keys").json()
    assert len(listed) == 1
    assert "key" not in listed[0]
    assert listed[0]["prefix"] == body["prefix"]


def test_create_api_key_rejects_unknown_operation(client: TestClient):
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "bad", "authorized_operations": ["not_a_real_operation"]},
    )
    assert response.status_code == 422


def test_create_api_key_requires_at_least_one_operation(client: TestClient):
    response = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "empty", "authorized_operations": []},
    )
    assert response.status_code == 422


def test_revoke_api_key(client: TestClient):
    created = client.post(
        "/api/v1/profiles/me/api-keys",
        json={"label": "temp", "authorized_operations": [EXPORT_ICS_ME]},
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
    raw = _make_api_key([EXPORT_ICS_ME])
    anon = _anon(client)
    response = anon.get(f"/api/v1/events/export/ics/me?api_key={raw}")
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]


def test_ics_me_with_api_key_header(client: TestClient):
    raw = _make_api_key([EXPORT_ICS_ME])
    anon = _anon(client)
    response = anon.get("/api/v1/events/export/ics/me", headers={"X-API-Key": raw})
    assert response.status_code == 200


def test_api_key_rejected_for_operation_not_authorized(client: TestClient):
    # Key authorizes ICS export only, but is used on another operation.
    raw = _make_api_key([EXPORT_ICS_ME])
    anon = _anon(client)
    response = anon.get(f"/api/v1/events/?api_key={raw}")
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
