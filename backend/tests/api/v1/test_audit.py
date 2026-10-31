"""Tests for the audit trail: middleware, client ingestion, admin reader, purge."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

import bbe2.utils.auth as auth_module
from bbe2 import models
from bbe2.database import get_engine
from bbe2.schemas.audit import AuditKind
from bbe2.services import audit as audit_service
from bbe2.utils.permissions import Resource

DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _rows(**filters) -> list[models.AuditEventDB]:
    with _session() as session:
        query = select(models.AuditEventDB).order_by(models.AuditEventDB.id)
        for column, value in filters.items():
            query = query.where(getattr(models.AuditEventDB, column) == value)
        return list(session.scalars(query).all())


# --- middleware -------------------------------------------------------------


def test_api_call_is_recorded_with_actor_and_route_pattern(client: TestClient):
    assert client.get("/api/v1/events/1").status_code == 200

    (row,) = _rows(kind=AuditKind.API_CALL, name="GET /api/v1/events/{event_id}")
    assert row.user_id == SEEDED_USER_ID
    assert row.method == "GET"
    assert row.path == "/api/v1/events/1"
    assert row.status == 200
    assert row.duration_ms is not None
    assert row.correlation_id
    assert row.details == {"event_id": "1"}


def test_anonymous_request_is_recorded_without_actor(client: TestClient):
    client.headers = {}
    assert client.get("/api/v1/profiles/me").status_code == 401

    (row,) = _rows(name="GET /api/v1/profiles/me")
    assert row.user_id is None
    assert row.status == 401


def test_health_version_and_ingest_are_not_recorded(client: TestClient):
    client.get("/api/v1/health")
    client.get("/api/v1/version")
    client.post(
        "/api/v1/audit/events",
        json={"events": [_page_view("/", "/")]},
    )
    assert _rows(kind=AuditKind.API_CALL) == []


def test_audit_write_failure_does_not_fail_the_request(client: TestClient, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(audit_service, "record_api_call", boom)
    assert client.get("/api/v1/events/1").status_code == 200


def test_is_audited_request():
    assert audit_service.is_audited_request("GET", "/api/v1/events/")
    assert audit_service.is_audited_request("POST", "/api/v1/auth/login")
    assert not audit_service.is_audited_request("OPTIONS", "/api/v1/events/")
    assert not audit_service.is_audited_request("GET", "/metrics")
    assert not audit_service.is_audited_request("GET", "/api/v1/health")
    assert not audit_service.is_audited_request("POST", "/api/v1/audit/events")


def test_redact_path_masks_secret_looking_params():
    assert (
        audit_service.redact_path(
            "/api/v1/invitations/abc123/accept", {"token": "abc123"}
        )
        == "/api/v1/invitations/<redacted>/accept"
    )
    assert (
        audit_service.redact_path("/api/v1/events/42", {"event_id": "42"})
        == "/api/v1/events/42"
    )
    assert audit_service.redact_params({"token": "abc123", "event_id": "42"}) == {
        "token": "<redacted>",
        "event_id": "42",
    }


def test_secret_path_params_never_reach_the_row(client: TestClient):
    client.headers = {}
    client.get("/api/v1/invitations/supersecrettoken")

    (row,) = _rows(name="GET /api/v1/invitations/{token}")
    assert "supersecrettoken" not in row.path
    assert row.details == {"token": "<redacted>"}


def test_trusted_at_keeps_plausible_client_clocks_only():
    now = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)
    recent = now - timedelta(seconds=30)
    assert audit_service.trusted_at(recent, now) == recent
    assert audit_service.trusted_at(now - timedelta(days=2), now) == now
    assert audit_service.trusted_at(now + timedelta(hours=1), now) == now


def test_route_pattern_replaces_whole_segments_only():
    assert (
        audit_service.route_pattern("/api/v1/events/1", {"event_id": "1"})
        == "/api/v1/events/{event_id}"
    )
    assert (
        audit_service.route_pattern(
            "/api/v1/files/7/move/3", {"file_id": "7", "target_id": 3}
        )
        == "/api/v1/files/{file_id}/move/{target_id}"
    )
    assert audit_service.route_pattern("/api/v1/events/", {}) == "/api/v1/events/"


def test_unmatched_route_is_recorded_under_a_fixed_label(client: TestClient):
    assert client.get("/api/v1/nope/abc").status_code == 404

    (row,) = _rows(name="GET <unmatched>")
    assert row.path == "/api/v1/nope/abc"


# --- client ingestion -------------------------------------------------------


def _page_view(name: str, path: str, at: datetime | None = None) -> dict:
    return {
        "kind": "PAGE_VIEW",
        "name": name,
        "path": path,
        "at": (at or datetime.now(tz=timezone.utc)).isoformat(),
    }


def test_ingest_stores_events_for_the_session_member(client: TestClient):
    # A plausible browser clock (a few seconds ago) is kept as the event time.
    at = (datetime.now(tz=timezone.utc) - timedelta(seconds=5)).replace(microsecond=0)
    res = client.post(
        "/api/v1/audit/events",
        json={
            "events": [
                _page_view("/profile/:profileId", "/profile/xyz", at),
                {
                    "kind": "CLICK",
                    "name": "Enregistrer",
                    "path": "/profile/xyz",
                    "at": at.isoformat(),
                    "details": {"tag": "button"},
                },
            ]
        },
    )
    assert res.status_code == 204

    rows = _rows(user_id=SEEDED_USER_ID)
    assert [(r.kind, r.name) for r in rows] == [
        (AuditKind.PAGE_VIEW, "/profile/:profileId"),
        (AuditKind.CLICK, "Enregistrer"),
    ]
    assert rows[1].details == {"tag": "button"}
    assert rows[0].at.replace(tzinfo=timezone.utc) == at


def test_ingest_overrides_an_implausible_client_clock(client: TestClient):
    before = datetime.now(tz=timezone.utc).replace(microsecond=0)
    client.post(
        "/api/v1/audit/events",
        json={
            "events": [_page_view("/", "/", datetime(2020, 1, 1, tzinfo=timezone.utc))]
        },
    )
    (row,) = _rows(kind=AuditKind.PAGE_VIEW)
    assert row.at.replace(tzinfo=timezone.utc) >= before


def test_ingest_rejects_api_call_kind_and_empty_batch(client: TestClient):
    res = client.post(
        "/api/v1/audit/events",
        json={
            "events": [
                {
                    "kind": "API_CALL",
                    "name": "x",
                    "path": "/",
                    "at": datetime.now(tz=timezone.utc).isoformat(),
                }
            ]
        },
    )
    assert res.status_code == 422
    assert client.post("/api/v1/audit/events", json={"events": []}).status_code == 422


def test_ingest_requires_authentication(client: TestClient):
    client.headers = {}
    res = client.post("/api/v1/audit/events", json={"events": [_page_view("/", "/")]})
    assert res.status_code == 401
    assert _rows(kind=AuditKind.PAGE_VIEW) == []


# --- admin reader -----------------------------------------------------------


def _seed(session, **overrides) -> models.AuditEventDB:
    row = models.AuditEventDB(
        **{
            "user_id": SEEDED_USER_ID,
            "kind": AuditKind.API_CALL,
            "name": "GET /api/v1/events/",
            "path": "/api/v1/events/",
            "method": "GET",
            "status": 200,
            "at": datetime.now(tz=timezone.utc),
            **overrides,
        }
    )
    session.add(row)
    return row


def test_admin_audit_denied_without_permission(client: TestClient, monkeypatch):
    def deny_admin(_roles, _action, resource):
        return resource != Resource.ADMIN

    monkeypatch.setattr(auth_module, "is_allowed", deny_admin)
    assert client.get("/api/v1/admin/audit").status_code == 403


def test_admin_audit_lists_newest_first_with_actor(client: TestClient):
    with _session() as session:
        _seed(session, name="GET /api/v1/events/")
        _seed(session, name="PUT /api/v1/events/{event_id}", method="PUT")
        session.commit()

    page = client.get("/api/v1/admin/audit").json()
    names = [item["name"] for item in page["items"]]
    # The GET /admin/audit call itself is recorded by the middleware only after
    # the response is built, so it is not in this page.
    assert names[:2] == ["PUT /api/v1/events/{event_id}", "GET /api/v1/events/"]
    assert page["items"][0]["actor"] == {
        "id": SEEDED_USER_ID,
        "first_name": "john",
        "last_name": "doe",
        "email": "john.doe@example.com",
    }
    assert page["next_cursor"] is None


def test_admin_audit_filters(client: TestClient):
    old = datetime.now(tz=timezone.utc) - timedelta(days=3)
    with _session() as session:
        _seed(session, name="GET /api/v1/files/", path="/api/v1/files/")
        _seed(
            session,
            name="DELETE /api/v1/files/{file_id}",
            method="DELETE",
            path="/api/v1/files/7",
        )
        _seed(
            session,
            kind=AuditKind.PAGE_VIEW,
            name="/files",
            path="/files",
            method=None,
            status=None,
        )
        _seed(
            session,
            kind=AuditKind.CLICK,
            name="Télécharger",
            path="/files",
            method=None,
            status=None,
            user_id=None,
        )
        _seed(session, name="GET /api/v1/profiles/", path="/api/v1/profiles/", at=old)
        session.commit()

    def names(**params) -> list[str]:
        return [
            i["name"]
            for i in client.get("/api/v1/admin/audit", params=params).json()["items"]
        ]

    assert names(kind="PAGE_VIEW") == ["/files"]
    assert names(mutations_only="true") == ["DELETE /api/v1/files/{file_id}"]
    assert names(q="files/7") == ["DELETE /api/v1/files/{file_id}"]
    assert "Télécharger" not in names(user_id=SEEDED_USER_ID)
    since = (datetime.now(tz=timezone.utc) - timedelta(days=1)).isoformat()
    assert "GET /api/v1/profiles/" not in names(since=since)
    until = (datetime.now(tz=timezone.utc) - timedelta(days=1)).isoformat()
    assert names(until=until) == ["GET /api/v1/profiles/"]


def test_admin_audit_cursor_pagination(client: TestClient):
    with _session() as session:
        for i in range(5):
            _seed(session, name=f"GET /api/v1/n{i}")
        session.commit()

    first = client.get(
        "/api/v1/admin/audit", params={"limit": 2, "kind": "API_CALL", "q": "/n"}
    ).json()
    assert [i["name"] for i in first["items"]] == ["GET /api/v1/n4", "GET /api/v1/n3"]
    assert first["next_cursor"] == first["items"][-1]["id"]

    second = client.get(
        "/api/v1/admin/audit",
        params={
            "limit": 2,
            "kind": "API_CALL",
            "q": "/n",
            "before": first["next_cursor"],
        },
    ).json()
    assert [i["name"] for i in second["items"]] == ["GET /api/v1/n2", "GET /api/v1/n1"]

    last = client.get(
        "/api/v1/admin/audit",
        params={
            "limit": 2,
            "kind": "API_CALL",
            "q": "/n",
            "before": second["next_cursor"],
        },
    ).json()
    assert [i["name"] for i in last["items"]] == ["GET /api/v1/n0"]
    assert last["next_cursor"] is None


# --- purge ------------------------------------------------------------------


@pytest.mark.usefixtures("client")
def test_purge_applies_a_window_per_family():
    now = datetime.now(tz=timezone.utc)
    with _session() as session:
        _seed(
            session,
            kind=AuditKind.PAGE_VIEW,
            name="old-view",
            method=None,
            status=None,
            at=now - timedelta(days=100),
        )
        _seed(
            session,
            kind=AuditKind.CLICK,
            name="fresh-click",
            method=None,
            status=None,
            at=now - timedelta(days=10),
        )
        _seed(session, name="old-call", at=now - timedelta(days=100))
        _seed(session, name="ancient-call", at=now - timedelta(days=400))
        session.commit()

        deleted = audit_service.purge_audit_events(
            session, client_retention_days=90, api_retention_days=365
        )
        session.commit()

    assert deleted == 2
    assert sorted(r.name for r in _rows()) == ["fresh-click", "old-call"]


@pytest.mark.usefixtures("client")
def test_purge_zero_disables_a_family():
    now = datetime.now(tz=timezone.utc)
    with _session() as session:
        _seed(
            session,
            kind=AuditKind.PAGE_VIEW,
            name="old-view",
            method=None,
            status=None,
            at=now - timedelta(days=1000),
        )
        _seed(session, name="old-call", at=now - timedelta(days=1000))
        session.commit()

        deleted = audit_service.purge_audit_events(
            session, client_retention_days=0, api_retention_days=365
        )
        session.commit()

    assert deleted == 1
    assert [r.name for r in _rows()] == ["old-view"]
