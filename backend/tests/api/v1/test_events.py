from fastapi.testclient import TestClient


def test_list_events(client: TestClient):
    response = client.get("/api/v1/events/")
    assert response.status_code == 200
    assert response.json() == [{"title": "Saint Nicolas", "date": "2022-12-09", "id": 1, "description": "Rendez-vous 14h au parc", "costume": "COSTUME"}]

def test_fetch_event(client: TestClient):
    response = client.get("/api/v1/events/1")
    assert response.status_code == 200
    assert response.json() == {"title": "Saint Nicolas", "date": "2022-12-09", "id": 1, "description": "Rendez-vous 14h au parc", "costume": "COSTUME"}

def test_create_event(client: TestClient):
    response = client.post("/api/v1/events/", json={
        "title": "Fete de la musique",
        "description": "Rendez-vous a 21h au parc",
        "date": "2022-06-21",
        "costume": "POLO"
    })
    assert response.status_code == 201
    assert response.json() == {
        "id": 2,
        "title": "Fete de la musique",
        "description": "Rendez-vous a 21h au parc",
        "date": "2022-06-21",
        "costume": "POLO"
    }

def test_edit_event(client: TestClient):
    response = client.put("/api/v1/events/1", json={
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "description": "Rendez-vous 13h au foyer logement",
        "costume": "COSTUME"
    })
    assert response.status_code == 200
    assert response.json() == {
        "title": "Saint Nicolas",
        "date": "2022-12-09",
        "id": 1,
        "description": "Rendez-vous 13h au foyer logement",
        "costume": "COSTUME"
    }
