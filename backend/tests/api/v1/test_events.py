from unittest.mock import ANY

from fastapi.testclient import TestClient


def test_list_events(client: TestClient):
    response = client.get("/api/v1/events/")
    print(response.json())
    assert response.status_code == 200
    assert response.json() == [
        {
            "title": "Saint Nicolas",
            "date": "2022-12-09",
            "id": 1,
            "description": "Rendez-vous 14h au parc",
            "costume": "COSTUME",
            "category": "TEST",
            "is_in_doodle": True,
        }
    ]


def test_fetch_event(client: TestClient):
    response = client.get("/api/v1/events/1")
    assert response.status_code == 200
    assert response.json() == {
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "id": 1,
        "description": "Rendez-vous 14h au parc",
        "costume": "COSTUME",
        "category": "TEST",
        "is_in_doodle": True,
    }


def test_create_event(client: TestClient):
    response = client.post(
        "/api/v1/events/",
        json={
            "title": "Fete de la musique",
            "description": "Rendez-vous a 21h au parc",
            "date": "2022-06-21",
            "costume": "POLO",
            "category": "CAT1",
            "is_in_doodle": True,
        },
    )
    assert response.status_code == 201
    assert response.json() == {
        "id": 2,
        "title": "Fete de la musique",
        "description": "Rendez-vous a 21h au parc",
        "date": "2022-06-21",
        "costume": "POLO",
        "category": "CAT1",
        "is_in_doodle": True,
    }


def test_edit_event(client: TestClient):
    response = client.put(
        "/api/v1/events/1",
        json={
            "title": "Saint Nicolas",
            "date": "2022-12-09",
            "description": "Rendez-vous 13h au foyer logement",
            "costume": "COSTUME",
            "category": "CAT1",
            "is_in_doodle": True,
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "id": 1,
        "description": "Rendez-vous 13h au foyer logement",
        "costume": "COSTUME",
        "category": "CAT1",
        "is_in_doodle": True,
    }


def test_put_responses(client: TestClient):
    response = client.put(
        "/api/v1/events/1/responses",
        json={
            "user_id": "a8e2d3249e9d997e",
            "value": True,
        },
    )
    print(response.text)
    assert response.status_code == 200
    assert response.json() == {
        "date": ANY,
        "event_id": 1,
        "user_id": "a8e2d3249e9d997e",
        "value": True,
    }


def test_list_responses(client: TestClient):
    response = client.get(
        "/api/v1/responses/",
    )
    assert response.status_code == 200
    assert response.json() == [
        {
            "date": "2024-01-01T00:00:00",
            "event_id": 1,
            "user_id": "a8e2d3249e9d997e",
            "value": True,
        },
    ]
