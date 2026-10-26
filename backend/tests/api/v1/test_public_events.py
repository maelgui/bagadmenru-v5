"""Tests for the public agenda feed (``GET /events/public``).

The feed is what the public website build consumes, authenticated with an API
key scoped to ``view:public_event``. It must return only events flagged public,
and only their public fields -- never the members-only description.
"""

from fastapi.testclient import TestClient

from tests.api.v1.test_api_keys import EVENT_PERMISSION, _anon, _make_api_key

PUBLIC_EVENT_PERMISSION = "view:public_event"

PUBLIC_EVENT = {
    "title": "Fest-noz des 30 ans",
    "description": "RDV 19h au Confluent pour l'installation, costume complet.",
    "date": "2026-11-14",
    "costume": "COSTUME",
    "category": "sortie",
    "is_in_doodle": True,
    "location": "Salle du Confluent, Montfort-sur-Meu",
    "start_time": "21:00",
    "is_public": True,
    "public_description": "Fest-noz anniversaire avec le Cercle Montfortais.",
}

PRIVATE_EVENT = {
    "title": "Réunion de bureau",
    "description": "Point trésorerie.",
    "date": "2026-11-20",
    "costume": "NONE",
    "category": "autre",
    "is_in_doodle": False,
}


def _create(client: TestClient, body: dict) -> int:
    response = client.post("/api/v1/events/", json=body)
    assert response.status_code == 201
    return response.json()["id"]


def test_public_feed_returns_only_public_events_and_public_fields(
    client: TestClient,
):
    public_id = _create(client, PUBLIC_EVENT)
    _create(client, PRIVATE_EVENT)

    response = client.get("/api/v1/events/public")
    assert response.status_code == 200
    # The seeded event (is_public defaults to False) and the private one are
    # both absent; only the explicitly public event is returned.
    assert response.json() == [
        {
            "id": public_id,
            "title": "Fest-noz des 30 ans",
            "date": "2026-11-14",
            "start_time": "21:00:00",
            "location": "Salle du Confluent, Montfort-sur-Meu",
            "category": "sortie",
            "description": "Fest-noz anniversaire avec le Cercle Montfortais.",
        }
    ]


def test_public_feed_filters_on_date_and_category(client: TestClient):
    _create(client, PUBLIC_EVENT)
    _create(client, {**PUBLIC_EVENT, "date": "2026-12-06", "category": "autre"})

    by_date = client.get("/api/v1/events/public?date__gte=2026-12-01").json()
    assert [e["date"] for e in by_date] == ["2026-12-06"]

    by_category = client.get("/api/v1/events/public?category=sortie").json()
    assert [e["date"] for e in by_category] == ["2026-11-14"]


def test_public_feed_with_scoped_api_key(client: TestClient):
    _create(client, PUBLIC_EVENT)
    raw = _make_api_key([PUBLIC_EVENT_PERMISSION])

    response = _anon(client).get("/api/v1/events/public", headers={"X-API-Key": raw})
    assert response.status_code == 200
    assert [e["title"] for e in response.json()] == ["Fest-noz des 30 ans"]


def test_public_feed_key_cannot_list_all_events(client: TestClient):
    # A key scoped to the public agenda must not reach the members' listing.
    raw = _make_api_key([PUBLIC_EVENT_PERMISSION])
    anon = _anon(client)
    assert anon.get("/api/v1/events/", headers={"X-API-Key": raw}).status_code == 403


def test_event_key_cannot_read_public_feed(client: TestClient):
    # Conversely view:event does not imply view:public_event: a key only
    # exercises the permissions it was explicitly granted.
    raw = _make_api_key([EVENT_PERMISSION])
    anon = _anon(client)
    assert (
        anon.get("/api/v1/events/public", headers={"X-API-Key": raw}).status_code == 403
    )


def test_public_feed_requires_auth(client: TestClient):
    assert _anon(client).get("/api/v1/events/public").status_code == 401
