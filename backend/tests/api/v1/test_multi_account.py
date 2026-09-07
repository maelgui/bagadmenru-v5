"""Multi-account (multi-session in one browser) tests — design §4.6.

These exercise the cookie-selection algorithm in ``bbe2.utils.auth.credentials``
and the session endpoints, using per-account ``bmr_session_<id>`` cookies plus
the ``active_account`` selector directly on the TestClient cookie jar (no real
login needed — identity lives in the signed JWT).
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.schemas.auth import JwtPayload
from bbe2.utils.auth import SESSION_COOKIE_PREFIX
from tests.conftest import DATABASE_URL, get_fake_settings

# The primary user is seeded by the ``client`` fixture (see conftest).
USER_A = "a8e2d3249e9d997e"
USER_B = "b1c2d3e4f5061728"


def _mint(user_id: str, first: str, last: str) -> str:
    payload = JwtPayload(
        sub=user_id,
        roles=[],
        first_name=first,
        last_name=last,
        email=f"{user_id}@example.com",
        exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    return jwt.encode(payload, get_fake_settings().jwt_secret_key, algorithm="HS256")


def _mint_without_email(user_id: str, first: str, last: str) -> str:
    """A token shaped like those issued before the email claim was added."""
    return jwt.encode(
        {
            "sub": user_id,
            "roles": [],
            "first_name": first,
            "last_name": last,
            "iat": datetime.now(tz=timezone.utc),
            "exp": datetime.now(tz=timezone.utc) + timedelta(minutes=5),
        },
        get_fake_settings().jwt_secret_key,
        algorithm="HS256",
    )


def _seed_second_user() -> None:
    """Add a second member so ``/profiles/me`` can resolve account B."""
    engine = get_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        s.merge(
            models.UserDB(
                id=USER_B,
                email="alice.b@example.com",
                first_name="Alice",
                last_name="Bee",
                instrument_id=1,
            )
        )
        s.commit()


def _cookie_client(client: TestClient) -> TestClient:
    """Strip the fixture's Bearer header so cookie selection is exercised."""
    client.headers.pop("Authorization", None)
    return client


def _set_session(client: TestClient, user_id: str, token: str) -> None:
    client.cookies.set(f"{SESSION_COOKIE_PREFIX}{user_id}", token)


def test_two_logins_keep_both_sessions_active_points_at_last(client: TestClient):
    """Two accounts each hold a distinct session cookie; both remain valid."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_B)

    # Both signed-in accounts are listed.
    resp = c.get("/api/v1/auth/sessions")
    assert resp.status_code == 200
    sessions = {s["id"]: s for s in resp.json()}
    assert set(sessions) == {USER_A, USER_B}
    # The selector points at the last account.
    assert sessions[USER_B]["active"] is True
    assert sessions[USER_A]["active"] is False


def test_credentials_selects_active_account(client: TestClient):
    """/profiles/me returns the account named by active_account."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))

    c.cookies.set("active_account", USER_A)
    assert c.get("/api/v1/profiles/me").json()["id"] == USER_A


def test_switching_active_account_changes_me(client: TestClient):
    """Rewriting active_account switches which profile /profiles/me returns."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))

    c.cookies.set("active_account", USER_A)
    assert c.get("/api/v1/profiles/me").json()["id"] == USER_A

    c.cookies.set("active_account", USER_B)
    assert c.get("/api/v1/profiles/me").json()["id"] == USER_B


def test_logout_removes_only_target_session(client: TestClient):
    """logout with account_id removes only that session; others still work."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_B)

    resp = c.post("/api/v1/auth/logout", json={"account_id": USER_B})
    assert resp.status_code == 200
    remaining = {s["id"] for s in resp.json()}
    assert remaining == {USER_A}

    # The deleted session cookie is expired by the response.
    set_cookie = resp.headers.get("set-cookie", "")
    assert f"{SESSION_COOKIE_PREFIX}{USER_B}=" in set_cookie
    # Simulate the browser dropping the expired cookie; account A still works.
    c.cookies.delete(f"{SESSION_COOKIE_PREFIX}{USER_B}")
    c.cookies.set("active_account", USER_A)
    assert c.get("/api/v1/profiles/me").json()["id"] == USER_A


def test_logout_all_clears_every_session(client: TestClient):
    """logout with all=true signs out every account in this browser."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_B)

    resp = c.post("/api/v1/auth/logout", json={"all": True})
    assert resp.status_code == 200
    # No sessions remain.
    assert resp.json() == []

    # Every per-account session cookie and the selector are expired.
    set_cookie = resp.headers.get("set-cookie", "")
    assert f"{SESSION_COOKIE_PREFIX}{USER_A}=" in set_cookie
    assert f"{SESSION_COOKIE_PREFIX}{USER_B}=" in set_cookie
    assert "active_account=" in set_cookie

    # Simulate the browser dropping the expired cookies; nothing authenticates.
    c.cookies.clear()
    assert c.get("/api/v1/profiles/me").status_code == 401


def test_logout_all_ignores_account_id(client: TestClient):
    """all=true takes precedence: a stray account_id does not scope it down."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_A)

    resp = c.post("/api/v1/auth/logout", json={"all": True, "account_id": USER_A})
    assert resp.status_code == 200
    assert resp.json() == []
    set_cookie = resp.headers.get("set-cookie", "")
    # Both are cleared, not just the named one.
    assert f"{SESSION_COOKIE_PREFIX}{USER_A}=" in set_cookie
    assert f"{SESSION_COOKIE_PREFIX}{USER_B}=" in set_cookie


def test_logout_all_clears_legacy_cookie(client: TestClient):
    """all=true also expires the legacy access_token cookie."""
    c = _cookie_client(client)
    c.cookies.set("access_token", _mint(USER_A, "john", "doe"))

    resp = c.post("/api/v1/auth/logout", json={"all": True})
    assert resp.status_code == 200
    assert resp.json() == []
    set_cookie = resp.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    assert "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()


def test_sessions_lists_all_with_active_flag(client: TestClient):
    """GET /auth/sessions lists every signed-in account with the right active."""
    _seed_second_user()
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_A)

    resp = c.get("/api/v1/auth/sessions")
    assert resp.status_code == 200
    by_id = {s["id"]: s for s in resp.json()}
    assert by_id[USER_A]["active"] is True
    assert by_id[USER_B]["active"] is False
    assert by_id[USER_A]["first_name"] == "john"


def test_backward_compat_legacy_access_token_cookie(client: TestClient):
    """A request with only the legacy access_token cookie still authenticates."""
    c = _cookie_client(client)
    c.cookies.set("access_token", _mint(USER_A, "john", "doe"))
    assert c.get("/api/v1/profiles/me").json()["id"] == USER_A


def test_stale_active_account_falls_back(client: TestClient):
    """A stale selector (missing session cookie) falls back, does not 401."""
    _seed_second_user()
    c = _cookie_client(client)
    # Only account B has a session cookie, but the selector points at A.
    _set_session(c, USER_B, _mint(USER_B, "Alice", "Bee"))
    c.cookies.set("active_account", USER_A)

    # Falls back to the sole present session (B) rather than 401ing.
    resp = c.get("/api/v1/profiles/me")
    assert resp.status_code == 200
    assert resp.json()["id"] == USER_B


def test_no_credentials_returns_401(client: TestClient):
    """No header and no cookies -> 401."""
    c = _cookie_client(client)
    c.cookies.clear()
    assert c.get("/api/v1/profiles/me").status_code == 401


def test_pre_email_token_still_works(client: TestClient):
    """A session token issued before the email claim must not be invalidated.

    Guards against logging out existing users on deploy: the email field is
    optional, so an older token still authenticates (email comes back null).
    """
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint_without_email(USER_A, "john", "doe"))
    c.cookies.set("active_account", USER_A)

    assert c.get("/api/v1/profiles/me").json()["id"] == USER_A
    resp = c.get("/api/v1/auth/sessions")
    assert resp.status_code == 200
    account = next(s for s in resp.json() if s["id"] == USER_A)
    assert account["email"] is None


def test_legacy_cookie_is_migrated_to_session(client: TestClient):
    """A legacy access_token cookie is upgraded to bmr_session_<id> on use."""
    c = _cookie_client(client)
    c.cookies.set("access_token", _mint(USER_A, "john", "doe"))

    resp = c.get("/api/v1/profiles/me")
    assert resp.status_code == 200
    assert resp.json()["id"] == USER_A

    set_cookie = resp.headers.get("set-cookie", "")
    # The new per-account session cookie and selector are set...
    assert f"{SESSION_COOKIE_PREFIX}{USER_A}=" in set_cookie
    assert "active_account=" in set_cookie
    # ...and the legacy cookie is expired (deleted).
    assert "access_token=" in set_cookie
    assert "Max-Age=0" in set_cookie or "expires=" in set_cookie.lower()


def test_migration_is_noop_for_bearer_and_sessions(client: TestClient):
    """Migration must not fire for Bearer clients or already-migrated browsers."""
    # Bearer header (the fixture default): no migration cookies emitted.
    resp = client.get("/api/v1/profiles/me")
    assert resp.status_code == 200
    assert SESSION_COOKIE_PREFIX not in resp.headers.get("set-cookie", "")

    # A browser already on the multi-account scheme: no re-migration.
    c = _cookie_client(client)
    _set_session(c, USER_A, _mint(USER_A, "john", "doe"))
    c.cookies.set("active_account", USER_A)
    resp2 = c.get("/api/v1/profiles/me")
    assert resp2.status_code == 200
    # No legacy cookie present, so nothing to migrate: no active_account rewrite.
    assert "access_token=" not in resp2.headers.get("set-cookie", "")
