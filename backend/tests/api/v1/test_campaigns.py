from unittest.mock import patch

import bbe2.utils.auth
from fastapi.testclient import TestClient

from bbe2.utils.permissions import Action, Resource


def _deny_campaign_management(roles, action, resource):
    if action == Action.EDIT and resource == Resource.CAMPAIGN:
        return False
    return True


def _create_campaign(client: TestClient, name="Tournée été", group_id=1):
    response = client.post(
        "/api/v1/campaigns/",
        json={"name": name, "description": "desc", "group_id": group_id},
    )
    assert response.status_code == 201
    return response.json()


def test_create_campaign_is_draft(client: TestClient):
    body = _create_campaign(client)
    assert body["status"] == "draft"
    assert body["name"] == "Tournée été"
    assert body["events"] == []
    assert body["first_event_date"] is None


def test_create_campaign_unknown_group_is_422(client: TestClient):
    response = client.post(
        "/api/v1/campaigns/",
        json={"name": "x", "group_id": 999},
    )
    assert response.status_code == 422


def test_publish_transitions_draft_to_active(client: TestClient):
    campaign = _create_campaign(client)
    cid = campaign["id"]

    response = client.post(f"/api/v1/campaigns/{cid}/publish")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

    response = client.post(f"/api/v1/campaigns/{cid}/publish")
    assert response.status_code == 409


def test_archive_requires_active(client: TestClient):
    campaign = _create_campaign(client)
    cid = campaign["id"]

    assert client.post(f"/api/v1/campaigns/{cid}/archive").status_code == 409

    client.post(f"/api/v1/campaigns/{cid}/publish")
    response = client.post(f"/api/v1/campaigns/{cid}/archive")
    assert response.status_code == 200
    assert response.json()["status"] == "archived"


def test_link_and_unlink_event(client: TestClient):
    campaign = _create_campaign(client)
    cid = campaign["id"]

    assert client.post(f"/api/v1/campaigns/{cid}/events/1").status_code == 200

    detail = client.get(f"/api/v1/campaigns/{cid}").json()
    assert [e["id"] for e in detail["events"]] == [1]
    assert detail["first_event_date"] == "2022-12-09"

    assert client.delete(f"/api/v1/campaigns/{cid}/events/1").status_code == 204
    detail = client.get(f"/api/v1/campaigns/{cid}").json()
    assert detail["events"] == []


def test_link_event_already_linked_is_409(client: TestClient):
    first = _create_campaign(client, name="A")
    second = _create_campaign(client, name="B")

    assert client.post(f"/api/v1/campaigns/{first['id']}/events/1").status_code == 200
    response = client.post(f"/api/v1/campaigns/{second['id']}/events/1")
    assert response.status_code == 409


def test_delete_campaign_detaches_events(client: TestClient):
    campaign = _create_campaign(client)
    cid = campaign["id"]
    client.post(f"/api/v1/campaigns/{cid}/events/1")

    assert client.delete(f"/api/v1/campaigns/{cid}").status_code == 204

    event = client.get("/api/v1/events/1").json()
    assert event["campaign_id"] is None


def test_draft_campaign_hidden_from_non_manager(client: TestClient, monkeypatch):
    campaign = _create_campaign(client)
    cid = campaign["id"]

    monkeypatch.setattr(bbe2.utils.auth, "is_allowed", _deny_campaign_management)

    assert client.get(f"/api/v1/campaigns/{cid}").status_code == 404
    assert client.get("/api/v1/campaigns/").json() == []


def test_active_campaign_visible_to_non_manager(client: TestClient, monkeypatch):
    campaign = _create_campaign(client)
    cid = campaign["id"]
    client.post(f"/api/v1/campaigns/{cid}/publish")

    monkeypatch.setattr(bbe2.utils.auth, "is_allowed", _deny_campaign_management)

    assert client.get(f"/api/v1/campaigns/{cid}").status_code == 200
    assert len(client.get("/api/v1/campaigns/").json()) == 1


def test_publish_notifies_linked_doodle_events(client: TestClient):
    campaign = _create_campaign(client)
    cid = campaign["id"]
    client.post(f"/api/v1/campaigns/{cid}/events/1")

    with patch(
        "bbe2.api.v1.endpoints.campaigns.notify_new_event"
    ) as notify:
        response = client.post(f"/api/v1/campaigns/{cid}/publish")
        assert response.status_code == 200
    assert notify.called


def test_event_linked_to_draft_hidden_from_non_manager(
    client: TestClient, monkeypatch
):
    campaign = _create_campaign(client)
    cid = campaign["id"]
    client.post(f"/api/v1/campaigns/{cid}/events/1")

    monkeypatch.setattr(bbe2.utils.auth, "is_allowed", _deny_campaign_management)

    assert client.get("/api/v1/events/1").status_code == 404
    assert client.get("/api/v1/events/").json() == []


def test_linkable_filter_excludes_linked_events(client: TestClient):
    client.post(
        "/api/v1/events/",
        json={
            "title": "Autre event",
            "description": "d",
            "date": "2023-01-01",
            "costume": "POLO",
            "category": "CAT1",
            "is_in_doodle": False,
        },
    )
    campaign = _create_campaign(client)
    cid = campaign["id"]

    linkable = client.get("/api/v1/events/", params={"linkable": True}).json()
    assert {e["id"] for e in linkable} == {1, 2}

    client.post(f"/api/v1/campaigns/{cid}/events/1")
    linkable = client.get("/api/v1/events/", params={"linkable": True}).json()
    assert {e["id"] for e in linkable} == {2}
