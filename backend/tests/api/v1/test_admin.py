"""Tests for the administration endpoints (/api/v1/admin/*)."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import bbe2.utils.auth as auth_module
from bbe2 import models
from bbe2.database import get_engine
from bbe2.utils.api_key import create_api_key
from bbe2.utils.permissions import Resource, get_permissions_for_roles

DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _seed_roles_and_group() -> None:
    with _session() as session:
        staff = models.RoleDB(id="staff", description="Staff")
        eleves = models.RoleDB(id="eleves", description="Élèves")
        session.add_all([staff, eleves])
        session.flush()
        bureau = models.GroupDB(id=10, name="Bureau", color="#000")
        bureau.roles = [staff]
        bureau.members = [session.get(models.UserDB, SEEDED_USER_ID)]
        vide = models.GroupDB(id=11, name="Vide", color="#000")
        vide.roles = [eleves]
        session.add_all([bureau, vide])
        session.commit()


def test_admin_resource_is_only_held_by_admin():
    assert "view:admin" in get_permissions_for_roles(["admin"])
    for role in ("staff", "bagad", "eleves", "intervenants"):
        assert "view:admin" not in get_permissions_for_roles([role])
        assert "edit:admin" not in get_permissions_for_roles([role])


def test_admin_routes_denied_without_permission(client: TestClient, monkeypatch):
    def deny_admin(_roles, action, resource):
        return resource != Resource.ADMIN

    monkeypatch.setattr(auth_module, "is_allowed", deny_admin)
    assert client.get("/api/v1/admin/overview").status_code == 403
    assert client.get("/api/v1/admin/members").status_code == 403
    assert client.delete("/api/v1/admin/api-keys/abc").status_code == 403


def test_overview_counts(client: TestClient):
    _seed_roles_and_group()
    with _session() as session:
        create_api_key(session, SEEDED_USER_ID, "k", ["view:event"])
        session.commit()

    overview = client.get("/api/v1/admin/overview").json()

    assert overview["members_total"] == 1
    assert overview["members_active"] == 1
    assert overview["members_without_credential"] == 1
    assert overview["groups"] == 3
    assert overview["roles"] == 2
    assert overview["api_keys_active"] == 1
    assert overview["events"] == 1
    assert overview["files"] == 0


def test_roles_detail_lists_permissions_groups_and_members(client: TestClient):
    _seed_roles_and_group()

    roles = {r["id"]: r for r in client.get("/api/v1/admin/roles").json()}

    assert roles["staff"]["permissions"] == get_permissions_for_roles(["staff"])
    assert [g["name"] for g in roles["staff"]["groups"]] == ["Bureau"]
    assert roles["staff"]["member_count"] == 1
    assert [g["name"] for g in roles["eleves"]["groups"]] == ["Vide"]
    assert roles["eleves"]["member_count"] == 0


def test_members_report_credential_posture(client: TestClient):
    _seed_roles_and_group()
    with _session() as session:
        user = session.get(models.UserDB, SEEDED_USER_ID)
        user.password = "hashed"
        session.add(
            models.PushSubscriptionDB(
                user_id=SEEDED_USER_ID, endpoint="https://p/1", p256dh="a", auth="b"
            )
        )
        session.commit()

    members = client.get("/api/v1/admin/members").json()

    assert len(members) == 1
    member = members[0]
    assert member["email"] == "john.doe@example.com"
    assert member["has_password"] is True
    assert member["passkey_count"] == 0
    assert member["push_subscription_count"] == 1
    assert member["membership_status"] == "none"
    assert [g["name"] for g in member["groups"]] == ["Bureau"]
    assert member["instrument"]["name"] == "Piccolo"


def test_api_keys_listed_with_owner_and_revocable(client: TestClient):
    with _session() as session:
        _, key = create_api_key(session, SEEDED_USER_ID, "Agenda", ["view:event"])
        session.commit()
        key_hash = key.key_hash

    keys = client.get("/api/v1/admin/api-keys").json()
    assert [k["label"] for k in keys] == ["Agenda"]
    assert keys[0]["owner"]["first_name"] == "john"

    assert client.delete(f"/api/v1/admin/api-keys/{key_hash}").status_code == 204
    assert client.get("/api/v1/admin/api-keys").json() == []
    assert client.delete(f"/api/v1/admin/api-keys/{key_hash}").status_code == 404
    with _session() as session:
        revoked = session.get(models.ApiKeyDB, key_hash)
        assert revoked.revoked_at is not None


def test_system_status_reports_integrations(client: TestClient):
    system = client.get("/api/v1/admin/system").json()

    assert system["version"] == "dev"
    by_key = {i["key"]: i for i in system["integrations"]}
    assert set(by_key) >= {"smtp", "ovh", "push", "helloasso", "s3"}
    assert by_key["s3"]["configured"] is True


def test_test_email_goes_to_caller(client: TestClient, monkeypatch):
    sent = []

    async def fake_send_emails(_settings, emails):
        sent.extend(emails)

    monkeypatch.setattr("bbe2.utils.templates.send_emails", fake_send_emails)

    assert client.post("/api/v1/admin/notifications/test-email").status_code == 204
    assert [e.to for e in sent] == ["john.doe@example.com"]
    assert "john" in sent[0].body_text
