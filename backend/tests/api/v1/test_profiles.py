from unittest.mock import ANY

from fastapi.testclient import TestClient


def test_read_my_profile(client: TestClient):
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json() == {
        "picture_key": None,
        "instrument_id": 1,
        "first_name": "john",
        "last_name": "doe",
        "email": "john.doe@example.com",
        "id": "a8e2d3249e9d997e",
        "picture_url": ANY,
    }


def test_update_my_profile(client: TestClient):
    response = client.put(
        "/api/v1/profiles/me", json={"picture_key": "blbabla.jpg", "instrument_id": 1}
    )
    print(response.json())
    assert response.status_code == 200
    assert response.json() == {
        "picture_key": "blbabla.jpg",
        "instrument_id": 1,
        "first_name": "john",
        "last_name": "doe",
        "email": "john.doe@example.com",
        "id": "a8e2d3249e9d997e",
        "picture_url": ANY,
    }


def test_read_profile(client: TestClient):
    response = client.get("/api/v1/profiles/a8e2d3249e9d997e")
    assert response.status_code == 200
    assert response.json() == {
        "picture_key": "blbabla.jpg",
        "instrument_id": 1,
        "first_name": "john",
        "last_name": "doe",
        "email": "john.doe@example.com",
        "id": "a8e2d3249e9d997e",
        "picture_url": ANY,
    }


def test_list_profiles(client: TestClient):
    response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json() == [
        {
            "picture_key": "blbabla.jpg",
            "instrument_id": 1,
            "first_name": "john",
            "last_name": "doe",
            "email": "john.doe@example.com",
            "id": "a8e2d3249e9d997e",
            "picture_url": ANY,
        }
    ]
