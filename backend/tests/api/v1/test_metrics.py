"""Tests for the Prometheus /metrics endpoint and auth-flow counters.

Counters are process-global (prometheus_client default registry), so every
assertion compares before/after deltas instead of absolute values — other
tests in the session also increment them.
"""

from fastapi.testclient import TestClient
from prometheus_client import REGISTRY

from tests.api.v1.test_auth import _https_client, _seed_password


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


def test_password_reset_request_counts_only_existing_accounts(client: TestClient):
    labels = {"stage": "requested"}
    before = _counter("bbe2_password_resets_total", labels)

    # Unknown email: returns OK (no enumeration) but must NOT count.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert _counter("bbe2_password_resets_total", labels) == before

    # Existing account: counts.
    response = client.post(
        "/api/v1/auth/reset_password_request",
        json={"email": "john.doe@example.com"},
    )
    assert response.status_code == 200
    assert _counter("bbe2_password_resets_total", labels) == before + 1
