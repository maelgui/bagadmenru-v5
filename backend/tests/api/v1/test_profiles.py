from unittest.mock import ANY, MagicMock, patch

from fastapi.testclient import TestClient


def test_read_my_profile(client: TestClient):
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "first_name": "john",
        "last_name": "doe",
        "picture_key": None,
        "picture_url": None,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "name": "Piccolo",
        },
        "groups": [],
    }


def test_read_profile(client: TestClient):
    response = client.get("/api/v1/profiles/a8e2d3249e9d997e")
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "first_name": "john",
        "last_name": "doe",
        "picture_key": ANY,
        "picture_url": ANY,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "name": "Piccolo",
        },
        "groups": [],
    }


@patch("bbe2.utils.s3.S3Helper.set_tags")
def test_update_my_profile(mock_set_tags: MagicMock, client: TestClient):
    response = client.put(
        "/api/v1/profiles/me",
        json={
            "first_name": "john",
            "last_name": "doe2",
            "picture_key": "blbabla.jpg",
            "instrument_id": 1,
        },
    )
    mock_set_tags.assert_called_once_with(
        "blbabla.jpg",
        {"user_id": "a8e2d3249e9d997e", "temp": "false"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": "a8e2d3249e9d997e",
        "first_name": "john",
        "last_name": "doe2",
        "picture_key": "blbabla.jpg",
        "picture_url": ANY,
        "instrument": {
            "color": "#fff",
            "id": 1,
            "name": "Piccolo",
        },
        "groups": [],
    }


def test_list_profiles(client: TestClient):
    response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "a8e2d3249e9d997e",
            "first_name": "john",
            "last_name": "doe",
            "picture_key": None,
            "picture_url": None,
            "instrument": {
                "color": "#fff",
                "id": 1,
                "name": "Piccolo",
            },
            "groups": [],
        }
    ]
