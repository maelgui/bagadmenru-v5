from fastapi.testclient import TestClient

from bbe2.main import app

client = TestClient(app)


def test_read_my_profile():
    response = client.get("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_update_my_profile():
    response = client.put("/api/v1/profiles/me")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_read_profile():
    response = client.get("/api/v1/profiles/1")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_list_profiles():
    response = client.get("/api/v1/profiles")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}
