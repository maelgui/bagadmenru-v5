from fastapi.testclient import TestClient


def test_albums_auth(client: TestClient):
    response = client.get("/api/v1/albums/")
    assert response.status_code == 401
    response = client.post("/api/v1/albums/")
    assert response.status_code == 401
    response = client.get("/api/v1/albums/1")
    assert response.status_code == 401
    response = client.get("/api/v1/albums/143")
    assert response.status_code == 401
    response = client.put("/api/v1/albums/1")
    assert response.status_code == 401
    response = client.delete("/api/v1/albums/1")
    assert response.status_code == 401
    response = client.get("/api/v1/albums/1/photos")
    assert response.status_code == 401
    response = client.post("/api/v1/albums/1/photos")
    assert response.status_code == 401
    response = client.delete("/api/v1/albums/1/photos/1")
    assert response.status_code == 401


def test_list_albums(client: TestClient):
    response = client.get("/api/v1/albums/")
    assert response.status_code == 200
    assert response.json() == [{"title": "Mon Album", "date": "2022-06-03", "id": 1}]

def test_fetch_album(client: TestClient):
    response = client.get("/api/v1/albums/1")
    assert response.status_code == 200
    assert response.json() == {"title": "Mon Album", "date": "2022-06-03", "id": 1}

def test_fetch_album_404(client: TestClient):
    response = client.get("/api/v1/albums/345")
    assert response.status_code == 404
    response_content =response.json()
    assert "errors" in response_content
    assert len(response_content["errors"]) == 1
    assert response_content["errors"][0] == {
        "detail": "Album not found",
        "status": 404
    }

def test_list_album_photos(client: TestClient):
    response = client.get("/api/v1/albums/1/photos", headers={"X-Token": "coneofsilence"})
    assert response.status_code == 200
    assert response.json() == []

def test_create_album(client: TestClient):
    response = client.post("/api/v1/albums/", json={
        "title": "Mon album",
        "date": "2022-04-26",
    })
    print(response.json())
    assert response.status_code == 201
    assert response.json() == {
        "id": 2,
        "title": "Mon album",
        "date": "2022-04-26",
    }

def test_create_album_missing_body(client: TestClient):
    response = client.post("/api/v1/albums/", headers={"X-Token": "hailhydra"})
    print(response.json())
    assert response.status_code == 422
    assert response.json()["errors"][0]["status"] == "value_error.missing"
    assert response.json()["errors"][0]["source"] == ["body"]

def test_create_album_missing_field(client: TestClient):
    response = client.post("/api/v1/albums/", json={
        "title": "Mon album",
        # "date": datetime(2022, 02, 03)
    })
    print(response.json())
    assert response.status_code == 422
    assert response.json()["errors"][0]["status"] == "value_error.missing"
    assert response.json()["errors"][0]["source"] == ["body", "date"]

def test_edit_album(client: TestClient):
    response = client.put("/api/v1/albums/1", json={
        "title": "Mon album 2022",
        "date": "2001-06-03",
    })
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "title": "Mon album 2022",
        "date": "2001-06-03",
    }

def test_edit_album_404(client: TestClient):
    response = client.put("/api/v1/albums/18", json={
        "title": "Mon album 2022",
        "date": "2001-06-03",
    })
    assert response.status_code == 404

def test_delete_album(client: TestClient):
    response = client.delete("/api/v1/albums/1", headers={"X-Token": "coneofsilence"})
    assert response.status_code == 204
    assert response.json() == None

def test_delete_photo(client: TestClient):
    response = client.delete("/api/v1/albums/1/photo/1", headers={"X-Token": "coneofsilence"})
    assert response.status_code == 404
    assert response.json()["errors"][0]["status"] == 404
