from datetime import datetime, timedelta, timezone

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
    _set_user_values(email, password=myctx.hash(password))


def _clear_password(email: str) -> None:
    """Make the account passwordless (passkey-only), as invitation signups are."""
    _set_user_values(email, password=None)


def _set_user_values(email: str, **values) -> None:
    from sqlalchemy.orm import sessionmaker

    from bbe2.database import get_engine
    from tests.conftest import DATABASE_URL

    engine = get_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        s.execute(update(UserDB).where(UserDB.email == email).values(**values))
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
    # Single converged template: even an account WITH a password gets the
    # hybrid recovery email (code + link) — proving control of the email is
    # the actual authentication factor, whatever the account type.
    _seed_password("john.doe@example.com", "s3cret-password")
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    assert response.status_code == 200
    # The background task ran and produced exactly one recovery email.
    assert len(reset_sender.sent) == 1
    sent = reset_sender.sent[0]
    assert sent["template_name"] == "login_link"
    assert sent["subject"] == "Votre code de connexion"
    assert sent["to"] == "john.doe@example.com"
    # The template gets the grant id, the 6-digit code and the frontend URL.
    assert sent["template_data"]["grant_id"]
    code = sent["template_data"]["code"]
    assert len(code) == 6 and code.isdigit()
    assert "frontend_url" in sent["template_data"]
    # The response hands the requesting page the same grant id the email
    # carries, so the typed code verifies against the right grant.
    assert response.json()["grant_id"] == sent["template_data"]["grant_id"]


def test_reset_password_request_unknown_email_sends_nothing(
    client: TestClient, reset_sender
):
    # No user enumeration: the response must be indistinguishable from a
    # known email's (a decoy grant id of the same shape) while no email goes
    # out.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "does-not-exist@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["grant_id"]
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


def test_set_password_replaces_password_for_signed_in_member(
    client: TestClient, reset_sender
):
    """The authenticated successor of the old ``POST /auth/reset``.

    Recovery signs the member in (code or link); setting a new password is
    then a plain authenticated action — no token, and deliberately no current
    password (the flow exists because it was forgotten).
    """
    _seed_password("john.doe@example.com", "s3cret-password")
    try:
        response = client.post(
            "/api/v1/auth/set_password",
            json={"password": "brand-new-password"},
        )
        assert response.status_code == 200

        # A stale session cannot mint itself a durable password credential:
        # sessions last 90 days and cannot be revoked, so this action is
        # reserved to sessions younger than SET_PASSWORD_MAX_SESSION_AGE
        # (recovery sign-ins are seconds old when they reach it).
        import jwt

        from bbe2.schemas import JwtPayload
        from tests.conftest import get_fake_settings

        now = datetime.now(tz=timezone.utc)
        stale_token = jwt.encode(
            JwtPayload(
                sub="a8e2d3249e9d997e",
                roles=[],
                first_name="Mael",
                last_name="Gui",
                email="mael.gui@example.com",
                iat=now - timedelta(minutes=20),
                exp=now + timedelta(minutes=5),
            ).model_dump(),
            get_fake_settings().jwt_secret_key,
            algorithm="HS256",
        )
        response = client.post(
            "/api/v1/auth/set_password",
            json={"password": "hijack"},
            headers={"Authorization": f"Bearer {stale_token}"},
        )
        assert response.status_code == 403

        # The new password is live: it signs the member in.
        response = client.post(
            "/api/v1/auth/login",
            json={
                "type": "password",
                "email": "john.doe@example.com",
                "password": "brand-new-password",
            },
        )
        assert response.status_code == 200
    finally:
        # Restore the seed value so the shared test database keeps working
        # for other tests that password-login as this user.
        _seed_password("john.doe@example.com", "s3cret-password")


# ---------------------------------------------------------------------------
# Recovery sign-in: /auth/reset_password_request is the single entry point
# (anti-enumeration preserved) and sends the same recovery email to every
# account type. One credential, two vehicles (RFC 8628's device_code/user_code
# split): the grant id publicly identifies the request, the 6-digit code is
# the secret, and the emailed link is the same pair prefilled in a URL. All
# paths land on POST /auth/login_code, which signs the member in without
# involving a password.
# ---------------------------------------------------------------------------


def test_reset_password_request_passwordless_account_gets_login_link_email(
    client: TestClient, reset_sender
):
    _clear_password("john.doe@example.com")
    try:
        response = client.post(
            "/api/v1/auth/reset_password_request",
            json={"email": "john.doe@example.com"},
        )
        assert response.status_code == 200
        assert len(reset_sender.sent) == 1
        sent = reset_sender.sent[0]
        # A member who never had a password must not be asked to reset one:
        # the recovery email carries a sign-in code (primary) + link (fallback).
        assert sent["template_name"] == "login_link"
        assert sent["subject"] == "Votre code de connexion"
        assert sent["to"] == "john.doe@example.com"
        assert sent["template_data"]["grant_id"]
        code = sent["template_data"]["code"]
        assert len(code) == 6 and code.isdigit()
        assert "frontend_url" in sent["template_data"]
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def _request_recovery(client, reset_sender) -> dict:
    """POST a recovery request for john.doe and return the email's template data."""
    client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    return reset_sender.sent[-1]["template_data"]


def test_login_code_signs_the_member_in(client: TestClient, reset_sender):
    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        response = client.post(
            "/api/v1/auth/login_code",
            json={"grant_id": data["grant_id"], "code": data["code"]},
        )
        assert response.status_code == 200
        # Signed in: additive session cookie + active account, like a login.
        assert response.cookies.get("bmr_session_a8e2d3249e9d997e")
        assert response.cookies.get("active_account") == "a8e2d3249e9d997e"
        assert response.json()["access_token"]
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_login_code_via_link_is_the_same_credential(
    client: TestClient, reset_sender
):
    # The emailed link is this same call with both fields prefilled in its
    # URL; ``via`` only labels the funnel metric.
    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        response = client.post(
            "/api/v1/auth/login_code",
            json={"grant_id": data["grant_id"], "code": data["code"], "via": "link"},
        )
        assert response.status_code == 200
        assert response.cookies.get("bmr_session_a8e2d3249e9d997e")
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_login_code_grant_is_single_use(client: TestClient, reset_sender):
    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        body = {"grant_id": data["grant_id"], "code": data["code"]}
        first = client.post("/api/v1/auth/login_code", json=body)
        assert first.status_code == 200
        # Replaying the credential (typed again, or the emailed link opened
        # after the code was used) must not mint a second session.
        second = client.post("/api/v1/auth/login_code", json=body)
        assert second.status_code == 403
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_login_code_rejects_garbage_grant(client: TestClient):
    # Unknown grant ids (including decoys handed out for unknown emails) get
    # the same uniform 403 as a wrong code.
    response = client.post(
        "/api/v1/auth/login_code",
        json={"grant_id": "not-a-real-grant", "code": "123456"},
    )
    assert response.status_code == 403
    assert not response.cookies.get("bmr_session_a8e2d3249e9d997e")


def test_login_code_rejects_decoy_grant_for_unknown_email(
    client: TestClient, reset_sender
):
    # The decoy grant returned for an unknown email must behave exactly like
    # a wrong code against a real grant: uniform 403, nothing to learn.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "does-not-exist@example.com"},
    )
    decoy = response.json()["grant_id"]
    response = client.post(
        "/api/v1/auth/login_code",
        json={"grant_id": decoy, "code": "123456"},
    )
    assert response.status_code == 403


def test_login_code_rejects_deactivated_account(client: TestClient, reset_sender):
    # The grant was issued while the account was active, but the account may
    # have been deactivated since: the code must not resurrect its access.
    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        _set_user_values("john.doe@example.com", is_active=False)
        response = client.post(
            "/api/v1/auth/login_code",
            json={"grant_id": data["grant_id"], "code": data["code"]},
        )
        assert response.status_code == 403
        assert not response.cookies.get("bmr_session_a8e2d3249e9d997e")
    finally:
        _set_user_values("john.doe@example.com", is_active=True)
        _seed_password("john.doe@example.com", "s3cret-password")


def test_login_code_attempts_exhaustion_revokes_the_grant(
    client: TestClient, reset_sender
):
    from bbe2.services.otp import OTP_MAX_ATTEMPTS

    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        wrong = "000000" if data["code"] != "000000" else "111111"
        for _ in range(OTP_MAX_ATTEMPTS):
            response = client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": data["grant_id"], "code": wrong},
            )
            assert response.status_code == 403
        # The grant is now revoked: even the correct code (typed or via the
        # emailed link) fails.
        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": data["grant_id"], "code": data["code"]},
            ).status_code
            == 403
        )
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_login_code_wrong_then_right_within_attempts(client: TestClient, reset_sender):
    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)
        wrong = "000000" if data["code"] != "000000" else "111111"
        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": data["grant_id"], "code": wrong},
            ).status_code
            == 403
        )
        # One typo must not lock the member out.
        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": data["grant_id"], "code": data["code"]},
            ).status_code
            == 200
        )
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_new_recovery_request_supersedes_the_previous_grant(
    client: TestClient, reset_sender
):
    _clear_password("john.doe@example.com")
    try:
        first = _request_recovery(client, reset_sender)
        second = _request_recovery(client, reset_sender)
        # Only the latest email is valid: the old grant is dead.
        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": first["grant_id"], "code": first["code"]},
            ).status_code
            == 403
        )
        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": second["grant_id"], "code": second["code"]},
            ).status_code
            == 200
        )
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


def test_recovery_grant_expires(client: TestClient, reset_sender):
    # Single short expiry (Recovery.max_age, 10 min) for the whole grant:
    # once the token row expires, the code dies with it (typed or via link).
    from datetime import datetime, timedelta, timezone

    from sqlalchemy.orm import sessionmaker

    from bbe2.database import get_engine
    from bbe2.models.action_token import ActionTokenDB, ActionTokenValue
    from tests.conftest import DATABASE_URL

    _clear_password("john.doe@example.com")
    try:
        data = _request_recovery(client, reset_sender)

        # Age the grant directly on the token row.
        engine = get_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        with Session() as s:
            row = (
                s.query(ActionTokenDB)
                .filter(ActionTokenDB.token_type == ActionTokenValue.Recovery.value)
                .order_by(ActionTokenDB.created_at.desc())
                .first()
            )
            row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            s.commit()

        assert (
            client.post(
                "/api/v1/auth/login_code",
                json={"grant_id": data["grant_id"], "code": data["code"]},
            ).status_code
            == 403
        )
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


# --- WebAuthn registration challenge vs. concurrent responses ---------------
#
# The challenge lives in the cookie session. Before Starlette 1.0,
# SessionMiddleware re-issued the Set-Cookie on EVERY response whose session
# was non-empty, so during the post-login request burst a slow read-only
# response carrying a stale cookie could clobber the challenge between
# /preregister and /register — after the browser had already created the
# credential (orphan passkey in the user's keychain, never registered
# server-side). Starlette >= 1.0 only re-issues the cookie when the session
# was actually MODIFIED (Kludex/starlette#3166). These tests pin that
# behaviour so a dependency downgrade cannot silently reintroduce the race.


def _https_client(client: TestClient) -> TestClient:
    """A client that talks https so the Secure session cookie round-trips.

    Reuses the fixture's DB seeding, dependency overrides and Bearer token;
    the fixture client itself is plain http, over which httpx never sends
    Secure cookies.
    """
    from bbe2.main import app

    https_client = TestClient(app, base_url="https://testserver")
    https_client.headers = dict(client.headers)
    return https_client


_BOGUS_CREDENTIAL = {
    "id": "bogus",
    "rawId": "bogus",
    "response": {},
    "type": "public-key",
}


def test_readonly_responses_do_not_reissue_the_session_cookie(client: TestClient):
    """The core of the race: a response that did not modify the session must
    not carry a session Set-Cookie, otherwise its (possibly stale) snapshot
    would overwrite a challenge written by a concurrent request."""
    https_client = _https_client(client)

    # Write the challenge: this response legitimately sets the session cookie.
    pre = https_client.get("/api/v1/webauthn/preregister")
    assert pre.status_code == 200
    assert "session=" in (pre.headers.get("set-cookie") or "")

    # A read-only request (passkey list; never touches request.session): its
    # response must NOT re-issue the session cookie.
    readonly = https_client.get("/api/v1/webauthn")
    assert readonly.status_code == 200
    assert "session=" not in (readonly.headers.get("set-cookie") or "")


def test_register_finds_the_challenge_after_an_interleaved_request(
    client: TestClient,
):
    """End-to-end shape of the reported bug: preregister, another request in
    between, then register. The challenge must still be there — the 400 is
    about the bogus credential, NOT a missing challenge."""
    https_client = _https_client(client)

    https_client.get("/api/v1/webauthn/preregister")
    https_client.get("/api/v1/webauthn")  # post-login page-load style request

    response = https_client.post("/api/v1/webauthn/register", json=_BOGUS_CREDENTIAL)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid registration response"


def _post_forged_registration(https_client: TestClient, options: dict, up: bool):
    """POST a forged fmt="none" registration matching the pending challenge.

    Forges the exact shape a browser produces, with the UP flag set or
    cleared: a conditional create ceremony carries UP=0 (no user gesture), an
    explicit enrolment carries UP=1.
    """
    import hashlib
    import json as jsonlib
    import struct

    import cbor2
    from cryptography.hazmat.primitives.asymmetric import ec
    from webauthn.helpers import bytes_to_base64url

    from bbe2.dependencies import get_settings
    from bbe2.main import app

    settings = app.dependency_overrides[get_settings]()

    client_data = jsonlib.dumps(
        {
            "type": "webauthn.create",
            "challenge": options["challenge"],
            "origin": str(settings.frontend_base_url).rstrip("/"),
        }
    ).encode()
    public_numbers = (
        ec.generate_private_key(ec.SECP256R1()).public_key().public_numbers()
    )
    cose_key = cbor2.dumps(
        {
            1: 2,  # kty: EC2
            3: -7,  # alg: ES256
            -1: 1,  # crv: P-256
            -2: public_numbers.x.to_bytes(32, "big"),
            -3: public_numbers.y.to_bytes(32, "big"),
        }
    )
    credential_id = b"\x01" * 16
    flags = 0b0100_0000 | (0b0000_0001 if up else 0)  # AT, plus UP when asked
    auth_data = (
        hashlib.sha256(settings.relying_party_id.encode()).digest()
        + bytes([flags])
        + struct.pack(">I", 0)  # sign count
        + b"\x00" * 16  # AAGUID
        + struct.pack(">H", len(credential_id))
        + credential_id
        + cose_key
    )
    attestation_object = cbor2.dumps(
        {"fmt": "none", "attStmt": {}, "authData": auth_data}
    )

    return https_client.post(
        "/api/v1/webauthn/register",
        json={
            "id": bytes_to_base64url(credential_id),
            "rawId": bytes_to_base64url(credential_id),
            "response": {
                "clientDataJSON": bytes_to_base64url(client_data),
                "attestationObject": bytes_to_base64url(attestation_object),
                "transports": ["internal"],
            },
            "type": "public-key",
            "clientExtensionResults": {},
        },
    )


def test_register_accepts_a_conditional_create_attestation_without_up(
    client: TestClient,
):
    """A conditional create (silent passkey upgrade) happens WITHOUT any user
    gesture, so its attestation carries UP=0. When the client declared
    flow=silent at preregister, register must accept it — the caller is
    already authenticated. Requiring user presence made every silent upgrade
    fail with a 400 after the OS had already created the passkey, leaving an
    orphan credential in the user's keychain."""
    https_client = _https_client(client)
    options = https_client.get(
        "/api/v1/webauthn/preregister", params={"flow": "silent"}
    ).json()

    response = _post_forged_registration(https_client, options, up=False)
    assert response.status_code == 200, response.text

    passkeys = https_client.get("/api/v1/webauthn").json()
    assert len(passkeys) == 1


def test_register_rejects_missing_user_presence_on_explicit_flow(
    client: TestClient,
):
    """WebAuthn L3 §7.1 step 15: outside conditional mediation the RP must
    verify UP=1. An explicit enrolment (settings page, post-reset screen)
    always involves a user gesture, so a UP=0 attestation on the explicit
    flow is invalid."""
    https_client = _https_client(client)
    options = https_client.get("/api/v1/webauthn/preregister").json()

    response = _post_forged_registration(https_client, options, up=False)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid registration response"


def test_register_accepts_user_presence_on_explicit_flow(client: TestClient):
    https_client = _https_client(client)
    options = https_client.get("/api/v1/webauthn/preregister").json()

    response = _post_forged_registration(https_client, options, up=True)
    assert response.status_code == 200, response.text

    passkeys = https_client.get("/api/v1/webauthn").json()
    assert len(passkeys) == 1


def test_register_without_pending_challenge_is_rejected(client: TestClient):
    https_client = _https_client(client)
    response = https_client.post("/api/v1/webauthn/register", json=_BOGUS_CREDENTIAL)
    assert response.status_code == 400
    assert response.json()["detail"] == "No registration challenge in session"


def test_password_login_empties_the_challenge_session(client: TestClient):
    """A password login clears the leftover conditional-login auth challenge.

    The login page prepares a conditional (autofill) passkey login on mount,
    which stores an auth_challenge in the cookie session. A password login
    never consumes it; popping it empties the session so Starlette stops
    re-issuing the stale cookie on every subsequent response (the amplifier of
    the registration-challenge race).
    """
    from bbe2.main import app

    _seed_password("john.doe@example.com", "s3cret-password")

    # The session cookie is Secure (https_only=True), so it only round-trips
    # over https; the shared fixture client is plain http. The fixture still
    # provides the DB seeding and dependency overrides.
    https_client = TestClient(app, base_url="https://testserver")

    # Mount-time conditional login preparation: session now holds a challenge.
    prepare = https_client.get("/api/v1/auth/login")
    assert prepare.status_code == 200
    assert "session=" in (prepare.headers.get("set-cookie") or "")

    response = https_client.post(
        "/api/v1/auth/login",
        json={
            "type": "password",
            "email": "john.doe@example.com",
            "password": "s3cret-password",
        },
    )
    assert response.status_code == 200
    # Session emptied -> Starlette expires the cookie on this response.
    assert "session=null" in (response.headers.get("set-cookie") or "")
