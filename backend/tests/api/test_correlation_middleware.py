"""Tests for the correlation ID HTTP middleware."""

from bbe2.utils.correlation import CORRELATION_ID_HEADER, is_valid_correlation_id


def test_response_includes_generated_correlation_id(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    value = resp.headers.get(CORRELATION_ID_HEADER)
    assert value is not None
    assert is_valid_correlation_id(value)


def test_response_echoes_valid_client_correlation_id(client):
    supplied = "client-supplied-1234"
    resp = client.get("/api/v1/health", headers={CORRELATION_ID_HEADER: supplied})
    assert resp.status_code == 200
    assert resp.headers.get(CORRELATION_ID_HEADER) == supplied


def test_response_replaces_invalid_client_correlation_id(client):
    # CRLF injection attempt must never be echoed back.
    resp = client.get("/api/v1/health", headers={CORRELATION_ID_HEADER: "bad value"})
    assert resp.status_code == 200
    returned = resp.headers.get(CORRELATION_ID_HEADER)
    assert returned != "bad value"
    assert is_valid_correlation_id(returned)
