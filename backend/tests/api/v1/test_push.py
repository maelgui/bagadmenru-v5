"""Tests for push-subscribed device listing and revocation.

Covers the device-management surface of the push API: subscribing captures the
raw User-Agent, the current user can list their own devices (without ever
exposing the encryption keys), and a device can be revoked by id. Listing and
revocation are scoped to the authenticated user.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2.database import get_engine
from bbe2.models.push_subscription import PushSubscriptionDB

# Must match DATABASE_URL / seeded user in tests/conftest.py
DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"
OTHER_USER_ID = "someone-else-0000"


def _session():
    engine = get_engine(DATABASE_URL)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def _insert_subscription(
    endpoint: str,
    user_id: str = SEEDED_USER_ID,
    user_agent: str | None = None,
) -> str:
    """Insert a raw subscription row and return its id."""
    with _session() as session:
        sub = PushSubscriptionDB(
            user_id=user_id,
            endpoint=endpoint,
            p256dh="test-p256dh",
            auth="test-auth",
            user_agent=user_agent,
        )
        session.add(sub)
        session.commit()
        return sub.id


def _subscribe_body(endpoint: str) -> dict:
    return {"endpoint": endpoint, "p256dh": "test-p256dh", "auth": "test-auth"}


# --- Subscribe captures the User-Agent -----------------------------------


def test_subscribe_captures_user_agent(client: TestClient):
    ua = "Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36"
    response = client.post(
        "/api/v1/push/subscribe",
        json=_subscribe_body("https://push.example/abc"),
        headers={"User-Agent": ua},
    )
    assert response.status_code == 201

    devices = client.get("/api/v1/push/subscriptions").json()
    assert len(devices) == 1
    assert devices[0]["user_agent"] == ua
    # A freshly subscribed device has never received a push.
    assert devices[0]["last_used_at"] is None


# --- Listing devices ------------------------------------------------------


def test_list_subscriptions_scoped_to_current_user(client: TestClient):
    mine = _insert_subscription("https://push.example/mine", user_id=SEEDED_USER_ID)
    _insert_subscription("https://push.example/theirs", user_id=OTHER_USER_ID)

    devices = client.get("/api/v1/push/subscriptions").json()
    ids = {d["id"] for d in devices}
    assert mine in ids
    # Another user's device must not leak into my list.
    assert all(d["id"] != "https://push.example/theirs" for d in devices)
    assert len(devices) == 1


def test_list_never_exposes_encryption_keys(client: TestClient):
    _insert_subscription("https://push.example/keys")
    devices = client.get("/api/v1/push/subscriptions").json()
    assert devices
    for device in devices:
        assert "p256dh" not in device
        assert "auth" not in device
        # The endpoint URL is also not exposed in the device list.
        assert "endpoint" not in device


def test_list_returns_stable_device_hash(client: TestClient):
    import hashlib

    endpoint = "https://push.example/hash-me"
    _insert_subscription(endpoint)
    devices = client.get("/api/v1/push/subscriptions").json()
    assert len(devices) == 1
    expected = hashlib.sha256(endpoint.encode("utf-8")).hexdigest()[:16]
    # The hash lets the browser recognise "this device" without the raw
    # endpoint ever being exposed.
    assert devices[0]["device_hash"] == expected


# --- Revoking a device by id ---------------------------------------------


def test_revoke_device_by_id(client: TestClient):
    sub_id = _insert_subscription("https://push.example/revoke-me")

    resp = client.delete(f"/api/v1/push/subscriptions/{sub_id}")
    assert resp.status_code == 204

    # Gone from the list...
    assert client.get("/api/v1/push/subscriptions").json() == []
    # ...and revoking again is a 404.
    assert client.delete(f"/api/v1/push/subscriptions/{sub_id}").status_code == 404


def test_cannot_revoke_another_users_device(client: TestClient):
    sub_id = _insert_subscription(
        "https://push.example/not-mine", user_id=OTHER_USER_ID
    )
    # The current user must not be able to delete a device they don't own.
    resp = client.delete(f"/api/v1/push/subscriptions/{sub_id}")
    assert resp.status_code == 404
