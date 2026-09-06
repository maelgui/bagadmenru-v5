from fastapi.testclient import TestClient
from sqlalchemy import update

from bbe2.models.user import UserDB
from bbe2.utils.auth import myctx


def test_login_sets_cookie_with_root_path(client: TestClient):
    # Runs under the development environment so we can assert the localhost
    # (non-Secure) cookie behaviour. The fixture DB is a shared SQLite file, so
    # we seed a password via the same engine the app uses.
    from bbe2.config import Environment, get_settings
    from bbe2.main import app
    from tests.conftest import get_fake_settings

    _seed_password("john.doe@example.com", "s3cret-password")

    def dev_settings():
        s = get_fake_settings()
        s.environment = Environment.DEVELOPMENT
        return s

    app.dependency_overrides[get_settings] = dev_settings
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "type": "password",
                "email": "john.doe@example.com",
                "password": "s3cret-password",
            },
        )
    finally:
        app.dependency_overrides[get_settings] = get_fake_settings

    assert response.status_code == 200
    set_cookie = response.headers.get("set-cookie", "")
    # Login now sets the per-account multi-account session cookie
    # (bmr_session_<id>) plus the active_account selector, not the legacy
    # single access_token cookie.
    assert "bmr_session_" in set_cookie
    assert "active_account=" in set_cookie
    # The cookie must be scoped to Path=/ so browsers (Safari in particular,
    # which enforces the RFC 6265 default-path strictly) send it on every
    # endpoint, not just /api/v1/auth. Regression guard for the "login 200 but
    # /me 401 on Safari" bug.
    assert "Path=/" in set_cookie
    # In development the cookie must NOT be Secure, otherwise Safari refuses to
    # store it over http://localhost.
    assert "Secure" not in set_cookie


def _seed_password(email: str, password: str) -> None:
    from sqlalchemy.orm import sessionmaker

    from bbe2.database import get_engine
    from tests.conftest import DATABASE_URL

    engine = get_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        s.execute(
            update(UserDB)
            .where(UserDB.email == email)
            .values(password=myctx.hash(password))
        )
        s.commit()


def test_login_cookie_is_secure_in_production(client: TestClient):
    from bbe2.config import Environment, get_settings
    from bbe2.main import app
    from tests.conftest import get_fake_settings

    _seed_password("john.doe@example.com", "s3cret-password")

    def prod_settings():
        s = get_fake_settings()
        s.environment = Environment.PRODUCTION
        return s

    app.dependency_overrides[get_settings] = prod_settings
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "type": "password",
                "email": "john.doe@example.com",
                "password": "s3cret-password",
            },
        )
    finally:
        app.dependency_overrides[get_settings] = get_fake_settings

    assert response.status_code == 200
    set_cookie = response.headers.get("set-cookie", "")
    # Outside development the session cookie must be Secure.
    assert "bmr_session_" in set_cookie
    assert "Secure" in set_cookie
    assert "Path=/" in set_cookie


def test_login_unknown_user_returns_401(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "type": "password",
            "email": "does-not-exist@example.com",
            "password": "whatever",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Bad credentials"


def test_login_passkey_only_account_returns_401(client: TestClient):
    # The seeded user (john.doe) has no password hash set. Attempting a
    # password login must be rejected cleanly (not 500) -- regression test for
    # verify_and_update() being called with a None hash.
    response = client.post(
        "/api/v1/auth/login",
        json={
            "type": "password",
            "email": "john.doe@example.com",
            "password": "whatever",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Bad credentials"


def test_logout_clears_cookie(client: TestClient):
    # A client whose only credential is the legacy access_token cookie must
    # still be able to log out (backward compatibility). Drop the Bearer header
    # the fixture sets and rely on the cookie instead.
    client.headers.pop("Authorization", None)
    client.cookies.set("access_token", _legacy_token())
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    # The legacy access_token cookie must be expired/cleared on logout.
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token=" in set_cookie
    # The cookie must be pinned to Path=/ so the browser matches (and clears)
    # the same cookie that login set. Without an explicit path Safari would
    # scope it to /api/v1/auth and fail to send it on other endpoints,
    # producing a 401 right after login. Regression guard.
    assert "Path=/" in set_cookie


def _legacy_token() -> str:
    from datetime import datetime, timedelta, timezone

    import jwt

    from bbe2.schemas.auth import JwtPayload
    from tests.conftest import get_fake_settings

    payload = JwtPayload(
        sub="a8e2d3249e9d997e",
        roles=[],
        first_name="john",
        last_name="doe",
        email="john.doe@example.com",
        exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    return jwt.encode(payload, get_fake_settings().jwt_secret_key, algorithm="HS256")
