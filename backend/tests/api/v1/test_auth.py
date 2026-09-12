import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update

import bbe2.utils.auth
from bbe2.models.user import UserDB
from bbe2.utils.auth import myctx
from bbe2.utils.correlation import CORRELATION_ID_HEADER
from bbe2.utils.templates import EmailSender


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


def test_verify_returns_204_when_allowed(client: TestClient):
    # The `client` fixture patches is_allowed to always grant, so an
    # authenticated caller with VIEW:EMAIL passes the forward-auth gate.
    response = client.get("/api/v1/auth/verify")
    assert response.status_code == 204
    assert response.content == b""


def test_verify_returns_403_when_role_lacks_email_access(
    client: TestClient, monkeypatch
):
    # A valid session whose roles do NOT grant VIEW:EMAIL must be rejected so
    # ordinary members cannot read the Mailpit inbox.
    monkeypatch.setattr(bbe2.utils.auth, "is_allowed", lambda *a, **k: False)
    response = client.get("/api/v1/auth/verify")
    assert response.status_code == 403


def test_verify_returns_401_when_unauthenticated(client: TestClient):
    # No session cookie and no bearer header -> forward-auth denies access.
    response = client.get("/api/v1/auth/verify", headers={"Authorization": ""})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Password reset request: the SMTP send now runs in a BackgroundTask so a slow
# or unreachable mail server can't stall (or fail) the response. TestClient
# executes background tasks synchronously after the response returns, so the
# captured FakeSender still records the send.
# ---------------------------------------------------------------------------


class _CapturingSender:
    """Stand-in for EmailSender: records batch_send_emails calls, sends nothing."""

    def __init__(self) -> None:
        self.sent: list[dict] = []
        self.correlation_ids: list = []

    async def batch_send_emails(self, subject, template_name, template_data):
        from bbe2.utils.correlation import get_correlation_id

        self.correlation_ids.append(get_correlation_id())
        for d in template_data:
            self.sent.append(
                {
                    "subject": subject,
                    "template_name": template_name,
                    "to": d.to,
                    "template_data": d.template_data,
                }
            )


@pytest.fixture()
def reset_sender(client):
    from bbe2.main import app

    fake = _CapturingSender()
    app.dependency_overrides[EmailSender] = lambda: fake
    yield fake
    app.dependency_overrides.pop(EmailSender, None)


def test_reset_password_request_sends_email_for_known_user(
    client: TestClient, reset_sender
):
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    assert response.status_code == 200
    # The background task ran and produced exactly one reset email.
    assert len(reset_sender.sent) == 1
    sent = reset_sender.sent[0]
    assert sent["template_name"] == "reset_password"
    assert sent["to"] == "john.doe@example.com"
    # The template gets the token and the frontend URL to build the link.
    assert sent["template_data"]["token"]
    assert "frontend_url" in sent["template_data"]


def test_reset_password_request_unknown_email_sends_nothing(
    client: TestClient, reset_sender
):
    # Must still return OK (no user enumeration) but emit no email.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "does-not-exist@example.com"},
    )
    assert response.status_code == 200
    assert reset_sender.sent == []


def test_reset_password_request_propagates_correlation_id(
    client: TestClient, reset_sender
):
    # The correlation ID captured during the request must be re-set inside the
    # background task so the outgoing email can be stamped with it (E2E relies
    # on this to locate the exact message).
    correlation_id = "e2e-abc123def456"
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
        headers={CORRELATION_ID_HEADER: correlation_id},
    )
    assert response.status_code == 200
    assert reset_sender.correlation_ids == [correlation_id]


def test_reset_password_signs_the_member_in(client: TestClient, reset_sender):
    """A successful reset also signs the member in (auto-login).

    Mirrors the invitation-accept flow: proving control of the email plus
    setting the password is a full authentication, so the response must set the
    session cookies (additive session, active account) — the client then offers
    passkey enrolment right away instead of bouncing to the login form.
    """
    client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    token = reset_sender.sent[0]["template_data"]["token"]

    # Reset to the seed value so the shared test database keeps working for
    # other tests that password-login as this user.
    response = client.post(
        "/api/v1/auth/reset",
        json={
            "email": "john.doe@example.com",
            "password": "s3cret-password",
            "password_confirm": "s3cret-password",
        },
        headers={"token": token},
    )
    assert response.status_code == 200
    assert response.cookies.get("bmr_session_a8e2d3249e9d997e")
    assert response.cookies.get("active_account") == "a8e2d3249e9d997e"
