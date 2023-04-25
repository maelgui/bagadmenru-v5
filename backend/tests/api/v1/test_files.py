from importlib.resources import open_binary 
from fastapi.testclient import TestClient


def test_get_root(client: TestClient):
    response = client.get("/api/v1/files/")
    assert response.status_code == 200
    assert response.json()["is_root"] == True

def test_get_file(client: TestClient):
    response = client.get("/api/v1/files/1")
    assert response.status_code == 200
    assert response.json() == {'id': 1, 'is_root': True, 'name': 'root', 'type': 'DIR', 'url': None}

def test_get_children(client: TestClient):
    response = client.get("/api/v1/files/1/children")
    assert response.status_code == 200
    assert response.json() == [{'id': 2, 'is_root': False, 'name': 'file1', 'type': 'DIR', 'url': None}, {'id': 3, 'is_root': False, 'name': 'file2', 'type': 'DIR', 'url': None}]

def test_add_file(client: TestClient):
    response = client.post("/api/v1/files/", files={"file": open_binary("tests.assets", "lena.jpg")})
    assert response.status_code == 201
    json_response = response.json()
    json_response.pop("url")
    assert json_response == {
        "id": 4,
        'is_root': False,
        'name': 'lena.jpg',
        'type': 'FILE',
    }

def test_edit_file(client: TestClient):
    response = client.put("/api/v1/files/2", json={
        "name": "Suite 2021",
    })
    assert response.status_code == 200
    assert response.json() == {'id': 2, 'is_root': False, 'name': 'Suite 2021', 'type': 'DIR', 'url': None}

def test_delete_file(client: TestClient):
    response = client.delete("/api/v1/files/1")
    assert response.status_code == 204
    assert response.json() == None
