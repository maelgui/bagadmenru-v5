from fastapi.testclient import TestClient


def test_search_requires_every_token_across_each_kind(client: TestClient):
    response = client.get("/api/v1/search/", params={"q": "nicolas file1 doe"})

    assert response.status_code == 200
    body = response.json()
    assert [e["title"] for e in body["events"]] == []
    assert body["profiles"] == []
    assert body["files"] == []

    response = client.get("/api/v1/search/", params={"q": "nicolas"})
    assert [e["title"] for e in response.json()["events"]] == ["Saint Nicolas"]

    response = client.get("/api/v1/search/", params={"q": "DOE"})
    assert [p["id"] for p in response.json()["profiles"]] == ["a8e2d3249e9d997e"]

    response = client.get("/api/v1/search/", params={"q": "file"})
    assert [h["file"]["name"] for h in response.json()["files"]] == ["file1", "file2"]
    assert response.json()["files"][0]["path"] == []


def test_search_requires_a_query(client: TestClient):
    response = client.get("/api/v1/search/")

    assert response.status_code == 422


def test_search_caps_the_limit(client: TestClient):
    response = client.get("/api/v1/search/", params={"q": "file", "limit": 50})

    assert response.status_code == 422


def test_search_requires_authentication(client: TestClient):
    client.headers = {}

    response = client.get("/api/v1/search/", params={"q": "file"})

    assert response.status_code == 401
