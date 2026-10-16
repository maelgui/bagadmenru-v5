from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from bbe2 import models
from bbe2.database import get_engine
from bbe2.services.mailing import MailingListDiff
from tests.conftest import DATABASE_URL


def _make_group_with_mailing_list(mailing_list="pupitres"):
    engine = get_engine(DATABASE_URL)
    from sqlalchemy.orm import sessionmaker

    Session = sessionmaker(bind=engine)
    with Session() as session:
        group = models.GroupDB(
            name="Bombardes", color="#fff", mailing_list=mailing_list
        )
        session.add(group)
        session.commit()
        return group.id


def test_preview_requires_mailing_list(client: TestClient):
    group_id = _make_group_with_mailing_list(mailing_list=None)
    response = client.get(f"/api/v1/groups/{group_id}/mailing-list/preview")
    assert response.status_code == 400


def test_preview_unknown_group(client: TestClient):
    response = client.get("/api/v1/groups/999999/mailing-list/preview")
    assert response.status_code == 404


def test_preview_returns_diff(client: TestClient):
    group_id = _make_group_with_mailing_list()
    diff = MailingListDiff(
        configured=True,
        subscribers=["old@example.com"],
        expected=["new@example.com"],
        to_add=["new@example.com"],
        to_remove=["old@example.com"],
    )
    with patch(
        "bbe2.api.v1.endpoints.profiles.mailing_service.compute_diff",
        new=AsyncMock(return_value=diff),
    ):
        response = client.get(f"/api/v1/groups/{group_id}/mailing-list/preview")
    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is True
    assert body["in_sync"] is False
    assert body["to_add"] == ["new@example.com"]
    assert body["to_remove"] == ["old@example.com"]


def test_preview_reports_unconfigured(client: TestClient):
    group_id = _make_group_with_mailing_list()
    diff = MailingListDiff(configured=False, expected=["a@example.com"])
    with patch(
        "bbe2.api.v1.endpoints.profiles.mailing_service.compute_diff",
        new=AsyncMock(return_value=diff),
    ):
        response = client.get(f"/api/v1/groups/{group_id}/mailing-list/preview")
    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is False
    assert body["in_sync"] is True


def test_sync_persists_synced_at(client: TestClient):
    group_id = _make_group_with_mailing_list()
    diff = MailingListDiff(
        configured=True,
        subscribers=["a@example.com"],
        expected=["a@example.com"],
    )
    with patch(
        "bbe2.api.v1.endpoints.profiles.mailing_service.sync_mailing_list",
        new=AsyncMock(return_value=diff),
    ):
        response = client.post(f"/api/v1/groups/{group_id}/mailing-list/sync")
    assert response.status_code == 200
    body = response.json()
    assert body["in_sync"] is True
    assert body["synced_at"] is not None
    assert body["error"] is None

    group = client.get(f"/api/v1/groups/{group_id}").json()
    assert group["mailing_list_synced_at"] is not None
    assert group["mailing_list_sync_error"] is None


def test_sync_records_error_on_failure(client: TestClient):
    group_id = _make_group_with_mailing_list()
    with patch(
        "bbe2.api.v1.endpoints.profiles.mailing_service.sync_mailing_list",
        new=AsyncMock(side_effect=RuntimeError("ovh down")),
    ):
        response = client.post(f"/api/v1/groups/{group_id}/mailing-list/sync")
    assert response.status_code == 502

    group = client.get(f"/api/v1/groups/{group_id}").json()
    assert group["mailing_list_sync_error"] == "ovh down"


def test_sync_unconfigured_does_not_set_synced_at(client: TestClient):
    group_id = _make_group_with_mailing_list()
    diff = MailingListDiff(configured=False, expected=["a@example.com"])
    with patch(
        "bbe2.api.v1.endpoints.profiles.mailing_service.sync_mailing_list",
        new=AsyncMock(return_value=diff),
    ):
        response = client.post(f"/api/v1/groups/{group_id}/mailing-list/sync")
    assert response.status_code == 200
    assert response.json()["synced_at"] is None
