from importlib.resources import files, open_binary
from unittest.mock import ANY, MagicMock, patch

from fastapi.testclient import TestClient


def test_get_root(client: TestClient):
    response = client.get("/api/v1/files/root")
    assert response.status_code == 200
    assert response.json()["parent_id"] == None


def test_get_file(client: TestClient):
    response = client.get("/api/v1/files/1")
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "file_key": None,
        "fileUrl": None,
        "downloadUrl": None,
        "name": "root",
        "parent_id": None,
        "type": "DIR",
        "child_count": None,
    }


def test_get_children(client: TestClient):
    response = client.get("/api/v1/files/1/children")
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 2,
            "file_key": None,
            "fileUrl": ANY,
            "downloadUrl": ANY,
            "name": "file1",
            "parent_id": 1,
            "type": "DIR",
            "child_count": 0,
        },
        {
            "id": 3,
            "file_key": None,
            "fileUrl": ANY,
            "downloadUrl": ANY,
            "name": "file2",
            "parent_id": 1,
            "type": "DIR",
            "child_count": 0,
        },
    ]


def test_get_children_counts_direct_children(client: TestClient):
    # Create two sub-folders inside folder 2 (initially empty).
    client.post("/api/v1/files/2", json={"name": "sub-a"})
    client.post("/api/v1/files/2", json={"name": "sub-b"})

    response = client.get("/api/v1/files/1/children")
    assert response.status_code == 200
    children = {child["id"]: child for child in response.json()}
    # folder 2 now has two direct children, folder 3 remains empty.
    assert children[2]["child_count"] == 2
    assert children[3]["child_count"] == 0


@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_file(mock_upload_file: MagicMock, client: TestClient):
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": (files("tests.assets") / "lena.jpg").open("rb")},
    )

    assert response.status_code == 201
    json_response = response.json()

    mock_upload_file.assert_called_once_with(
        ANY,
        json_response["file_key"],
        content_type="image/jpeg",
    )

    assert json_response == {
        "id": 4,
        "name": "lena.jpg",
        "type": "FILE",
        "file_key": ANY,
        "parent_id": 1,
        "fileUrl": ANY,
        "downloadUrl": ANY,
        "child_count": None,
    }


def test_edit_file(client: TestClient):
    response = client.put(
        "/api/v1/files/2",
        json={
            "name": "Suite 2021",
            "parent_id": 1,
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": 2,
        "name": "Suite 2021",
        "parent_id": 1,
        "type": "DIR",
        "fileUrl": None,
        "downloadUrl": None,
        "file_key": None,
        "child_count": None,
    }


def test_delete_file(client: TestClient):
    response = client.delete("/api/v1/files/1")
    assert response.status_code == 204
    assert response.content == b""
