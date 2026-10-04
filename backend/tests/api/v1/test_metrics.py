"""Tests for the Prometheus /metrics endpoint and auth-flow counters.

Counters are process-global (prometheus_client default registry), so every
assertion compares before/after deltas instead of absolute values — other
tests in the session also increment them.
"""

from fastapi.testclient import TestClient
from prometheus_client import REGISTRY

from tests.api.v1.test_auth import (  # noqa: F401  (reset_sender is a fixture)
    _clear_password,
    _https_client,
    _seed_password,
    reset_sender,
)


def _seed_passkey(email: str) -> None:
    """Attach one passkey to the user with the given email.

    Mirrors the invitation/enrolment path: a passkey row keyed on the user's
    passkey_user_id. Enough for the membership gauges to count the member as
    passkey-holding.
    """
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models
    from bbe2.database import get_engine
    from tests.conftest import DATABASE_URL

    engine = get_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    with Session() as s:
        user = s.query(models.UserDB).filter(models.UserDB.email == email).one()
        if user.passkey_user_id is None:
            user.passkey_user_id = b"\x7f" * 8
        s.add(
            models.PasskeyDB(
                passkey_user_id=user.passkey_user_id,
                credential_id=b"cred-" + email.encode()[:16],
                public_key=b"pk",
                sign_count=0,
                transports="internal",
                device_type="single_device",
                back_up=False,
                aaguid="00000000-0000-0000-0000-000000000000",
            )
        )
        s.commit()


def _counter(name: str, labels: dict[str, str]) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_metrics_endpoint_is_exposed_outside_api_prefix(client: TestClient):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    # Default HTTP metrics from the instrumentator are present.
    assert "http_request" in response.text


def test_metrics_endpoint_is_not_in_openapi_schema(client: TestClient):
    schema = client.get("/openapi.json").json()
    assert "/metrics" not in schema["paths"]


def test_password_login_success_increments_counter(client: TestClient):
    _seed_password("john.doe@example.com", "s3cret-password")
    labels = {"method": "password", "outcome": "success"}
    before = _counter("bbe2_auth_logins_total", labels)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "type": "password",
            "email": "john.doe@example.com",
            "password": "s3cret-password",
        },
    )

    assert response.status_code == 200
    assert _counter("bbe2_auth_logins_total", labels) == before + 1


def test_password_login_failure_increments_counter(client: TestClient):
    labels = {"method": "password", "outcome": "bad_credentials"}
    before = _counter("bbe2_auth_logins_total", labels)

    response = client.post(
        "/api/v1/auth/login",
        json={
            "type": "password",
            "email": "does-not-exist@example.com",
            "password": "whatever",
        },
    )

    assert response.status_code == 401
    assert _counter("bbe2_auth_logins_total", labels) == before + 1


def test_preregister_declared_flow_counts_started_and_labels_register(
    client: TestClient,
):
    # The session cookie is Secure: use the https client so it round-trips.
    https_client = _https_client(client)
    started = {"flow": "silent", "outcome": "started"}
    invalid = {"flow": "silent", "outcome": "invalid"}
    before_started = _counter("bbe2_webauthn_registrations_total", started)
    before_invalid = _counter("bbe2_webauthn_registrations_total", invalid)

    response = https_client.get(
        "/api/v1/webauthn/preregister", params={"flow": "silent"}
    )
    assert response.status_code == 200
    assert _counter("bbe2_webauthn_registrations_total", started) == before_started + 1

    # A garbage credential fails verification: the outcome must carry the flow
    # declared at preregister, proving it travelled through the session.
    response = https_client.post("/api/v1/webauthn/register", json={"response": {}})
    assert response.status_code == 400
    assert _counter("bbe2_webauthn_registrations_total", invalid) == before_invalid + 1


def test_preregister_flow_defaults_to_explicit(client: TestClient):
    labels = {"flow": "explicit", "outcome": "started"}
    before = _counter("bbe2_webauthn_registrations_total", labels)

    response = client.get("/api/v1/webauthn/preregister")
    assert response.status_code == 200
    assert _counter("bbe2_webauthn_registrations_total", labels) == before + 1


def test_preregister_rejects_unknown_flow(client: TestClient):
    response = client.get("/api/v1/webauthn/preregister", params={"flow": "sneaky"})
    assert response.status_code == 422


def test_register_without_preregister_is_unknown_flow(client: TestClient):
    labels = {"flow": "unknown", "outcome": "missing_challenge"}
    before = _counter("bbe2_webauthn_registrations_total", labels)

    response = client.post("/api/v1/webauthn/register", json={"response": {}})
    assert response.status_code == 400
    assert _counter("bbe2_webauthn_registrations_total", labels) == before + 1


def test_recovery_request_counts_only_existing_accounts(client: TestClient):
    labels = {"stage": "requested"}
    # Single converged funnel: every account type (password or not) feeds
    # bbe2_login_links_total.
    _seed_password("john.doe@example.com", "s3cret-password")
    before = _counter("bbe2_login_links_total", labels)

    # Unknown email: returns OK (no enumeration) but must NOT count.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert _counter("bbe2_login_links_total", labels) == before

    # Existing account: counts.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    assert response.status_code == 200
    assert _counter("bbe2_login_links_total", labels) == before + 1


def test_login_link_funnel_counts_requested_and_used(client: TestClient, reset_sender):
    _clear_password("john.doe@example.com")
    try:
        requested_before = _counter("bbe2_login_links_total", {"stage": "requested"})
        link_before = _counter("bbe2_login_links_total", {"stage": "used_link"})
        code_before = _counter("bbe2_login_links_total", {"stage": "used_code"})

        response = client.post(
            "/api/v1/auth/reset_password_request",
            json={"email": "john.doe@example.com"},
        )
        assert response.status_code == 200
        assert (
            _counter("bbe2_login_links_total", {"stage": "requested"})
            == requested_before + 1
        )

        # Code path (primary).
        data = reset_sender.sent[-1]["template_data"]
        response = client.post(
            "/api/v1/auth/login_code",
            json={"grant_id": data["grant_id"], "code": data["code"]},
        )
        assert response.status_code == 200
        assert (
            _counter("bbe2_login_links_total", {"stage": "used_code"})
            == code_before + 1
        )

        # Link path (fallback) — the same call with via="link", as the page
        # sends it when the fields came prefilled from the emailed URL. Needs
        # a fresh grant, the code consumed it.
        client.post(
            "/api/v1/auth/reset_password_request",
            json={"email": "john.doe@example.com"},
        )
        data = reset_sender.sent[-1]["template_data"]
        response = client.post(
            "/api/v1/auth/login_code",
            json={"grant_id": data["grant_id"], "code": data["code"], "via": "link"},
        )
        assert response.status_code == 200
        assert (
            _counter("bbe2_login_links_total", {"stage": "used_link"})
            == link_before + 1
        )
    finally:
        _seed_password("john.doe@example.com", "s3cret-password")


# --- Membership / credential gauges (scrape-time state, not flow) -----------
#
# Unlike the counters above, these are computed by the custom collector from
# the DB. They are unit-tested directly: a MembershipStateCollector is pointed
# at the test SQLite (via get_fake_settings) and registered on a throwaway
# registry, so collect() runs against the seeded DB without going through the
# /metrics endpoint or FastAPI's dependency injection. The seeded user
# (john.doe) starts passwordless with no passkey, a known base state.


def _collect_gauge(name: str, labels: dict[str, str] | None = None) -> float:
    """Run the collector against the test DB and read one gauge sample."""
    from prometheus_client import CollectorRegistry

    from bbe2.metrics import MembershipStateCollector
    from tests.conftest import get_fake_settings

    registry = CollectorRegistry()
    registry.register(MembershipStateCollector(get_fake_settings))
    return registry.get_sample_value(name, labels or {}) or 0.0


def _collector_metric_names() -> set[str]:
    from prometheus_client import CollectorRegistry

    from bbe2.metrics import MembershipStateCollector
    from tests.conftest import get_fake_settings

    registry = CollectorRegistry()
    collector = MembershipStateCollector(get_fake_settings)
    registry.register(collector)
    return {family.name for family in collector.collect()}


def test_membership_gauges_are_exposed(client: TestClient):
    names = _collector_metric_names()
    assert "bbe2_users" in names
    assert "bbe2_users_credentials" in names
    assert "bbe2_passkeys" in names
    assert "bbe2_push_subscriptions" in names


def test_users_gauge_counts_active_member(client: TestClient):
    # The single seeded member is active.
    assert _collect_gauge("bbe2_users", {"state": "active"}) == 1
    assert _collect_gauge("bbe2_users", {"state": "inactive"}) == 0


def test_credential_buckets_reflect_passwordless_seed(client: TestClient):
    # Seed state: john.doe has no password and no passkey -> "none".
    assert _collect_gauge("bbe2_users_credentials", {"credential": "none"}) == 1
    assert _collect_gauge("bbe2_users_credentials", {"credential": "passkey"}) == 0
    assert _collect_gauge("bbe2_users_credentials", {"credential": "password"}) == 0
    assert _collect_gauge("bbe2_passkeys") == 0


def test_credential_buckets_count_password_only(client: TestClient):
    _seed_password("john.doe@example.com", "s3cret-password")
    try:
        assert _collect_gauge("bbe2_users_credentials", {"credential": "password"}) == 1
        assert (
            _collect_gauge("bbe2_users_credentials", {"credential": "password_only"})
            == 1
        )
        assert _collect_gauge("bbe2_users_credentials", {"credential": "passkey"}) == 0
        assert _collect_gauge("bbe2_users_credentials", {"credential": "none"}) == 0
    finally:
        _clear_password("john.doe@example.com")


def test_credential_buckets_count_passkey_only(client: TestClient):
    # Passwordless seed + a passkey -> passkey_only, and bbe2_passkeys counts it.
    _seed_passkey("john.doe@example.com")
    assert _collect_gauge("bbe2_users_credentials", {"credential": "passkey"}) == 1
    assert _collect_gauge("bbe2_users_credentials", {"credential": "passkey_only"}) == 1
    assert _collect_gauge("bbe2_users_credentials", {"credential": "none"}) == 0
    assert _collect_gauge("bbe2_passkeys") == 1


def test_dual_credential_member_counts_in_both_overlapping_buckets(
    client: TestClient,
):
    _seed_password("john.doe@example.com", "s3cret-password")
    _seed_passkey("john.doe@example.com")
    try:
        # Overlapping buckets: counted in both passkey and password.
        assert _collect_gauge("bbe2_users_credentials", {"credential": "passkey"}) == 1
        assert _collect_gauge("bbe2_users_credentials", {"credential": "password"}) == 1
        # Exclusive buckets: neither *_only fires for a dual-credential member.
        assert (
            _collect_gauge("bbe2_users_credentials", {"credential": "passkey_only"})
            == 0
        )
        assert (
            _collect_gauge("bbe2_users_credentials", {"credential": "password_only"})
            == 0
        )
    finally:
        _clear_password("john.doe@example.com")


def test_scrape_never_500s_when_db_is_unreachable(client: TestClient):
    # A DB hiccup at scrape time must never 500 the endpoint (that would blind
    # the HTTP/latency metrics too): collect() yields no membership samples but
    # the /metrics endpoint still returns 200 with the default HTTP metrics.
    from prometheus_client import CollectorRegistry

    from bbe2.metrics import MembershipStateCollector
    from tests.conftest import get_fake_settings

    def broken_settings():
        s = get_fake_settings()
        s.database_url = "postgresql://nobody@127.0.0.1:1/nope"
        return s

    registry = CollectorRegistry()
    collector = MembershipStateCollector(broken_settings)
    registry.register(collector)
    # Collecting against an unreachable DB yields nothing, without raising.
    assert list(collector.collect()) == []

    # And the live endpoint stays up (its default HTTP metrics are unaffected).
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_request" in response.text
