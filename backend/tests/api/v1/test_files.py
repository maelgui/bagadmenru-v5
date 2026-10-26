import re
from importlib.resources import files, open_binary
from unittest.mock import ANY, MagicMock, patch

from fastapi.testclient import TestClient

from bbe2.config import get_settings
from bbe2.main import app
from bbe2.schemas import FileOrFolderType
from tests.conftest import DATABASE_URL, get_fake_settings, stored_file


def test_get_root(client: TestClient):
    response = client.get("/api/v1/files/root")
    assert response.status_code == 200
    assert response.json()["parent_id"] == None


def test_get_file(client: TestClient):
    response = client.get("/api/v1/files/1")
    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "current_version": None,
        "name": "root",
        "parent_id": None,
        "type": "DIR",
        "child_count": None,
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": None,
        "modified_at": None,
        "modifier": None,
    }


def test_get_children(client: TestClient):
    response = client.get("/api/v1/files/1/children")
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 2,
            "current_version": None,
            "name": "file1",
            "parent_id": 1,
            "type": "DIR",
            "child_count": 0,
            "source_format": None,
            "processing_status": None,
            "processing_failure_reason": None,
            "uploaded_at": ANY,
            "uploader": None,
            "modified_at": None,
            "modifier": None,
        },
        {
            "id": 3,
            "current_version": None,
            "name": "file2",
            "parent_id": 1,
            "type": "DIR",
            "child_count": 0,
            "source_format": None,
            "processing_status": None,
            "processing_failure_reason": None,
            "uploaded_at": ANY,
            "uploader": None,
            "modified_at": None,
            "modifier": None,
        },
    ]


def test_get_children_sorted_case_insensitively(client: TestClient):
    # Folders created out of alphabetical order, mixing upper/lower case. The
    # listing must come back case-insensitively sorted (Alpha, Ananas, banane,
    # zebra), not in C-collation byte order (uppercase before lowercase).
    for name in ("zebra", "Alpha", "banane", "Ananas"):
        assert client.post("/api/v1/files/1", json={"name": name}).status_code == 201

    response = client.get("/api/v1/files/1/children")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    added = [n for n in names if n in {"zebra", "Alpha", "banane", "Ananas"}]
    assert added == ["Alpha", "Ananas", "banane", "zebra"]


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

    mock_upload_file.assert_called_once_with(ANY, ANY, content_type="image/jpeg")
    assert re.fullmatch(r"files/[0-9a-f-]{36}-v1", mock_upload_file.call_args.args[1])

    assert json_response == {
        "id": 4,
        "name": "lena.jpg",
        "type": "FILE",
        "current_version": {
            "id": ANY,
            "number": 1,
            "size": ANY,
            "uploaded_at": ANY,
            "uploader": ANY,
            "superseded_at": None,
            "purged_at": None,
        },
        "parent_id": 1,
        "child_count": None,
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": ANY,
        "modified_at": None,
        "modifier": None,
    }


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_file_records_uploader_and_size(
    mock_upload_file: MagicMock, mock_delete: MagicMock, client: TestClient
):
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("notes.txt", b"hello world")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["uploader"]["name"] == "john doe"
    assert body["current_version"]["uploader"]["name"] == "john doe"
    assert body["current_version"]["size"] == len(b"hello world")
    assert body["modified_at"] is None


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_force_reupload_file_adds_a_version_and_keeps_the_previous_one(
    mock_upload_file: MagicMock, mock_delete: MagicMock, client: TestClient
):
    first = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("notes.txt", b"v1")},
    )
    assert first.status_code == 201
    original = first.json()

    second = client.post(
        "/api/v1/files/1/upload?force=true",
        files={"file": ("notes.txt", b"v2-longer")},
    )
    assert second.status_code == 201
    updated = second.json()

    assert updated["id"] == original["id"]
    assert updated["current_version"]["number"] == 2
    assert updated["current_version"]["size"] == len(b"v2-longer")
    assert updated["uploaded_at"] == original["uploaded_at"]
    assert updated["modified_at"] is not None
    assert updated["modifier"]["name"] == "john doe"
    first_key, second_key = (c.args[1] for c in mock_upload_file.call_args_list)
    assert first_key.endswith("-v1")
    assert second_key == first_key.removesuffix("-v1") + "-v2"
    mock_delete.assert_not_called()

    versions = client.get(f"/api/v1/files/{original['id']}/versions").json()
    assert [(v["number"], v["size"]) for v in versions] == [
        (2, len(b"v2-longer")),
        (1, len(b"v1")),
    ]
    assert versions[0]["superseded_at"] is None
    assert versions[1]["superseded_at"] is not None


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_reads_size_before_s3_consumes_the_stream(
    mock_upload_file: MagicMock, mock_delete: MagicMock, client: TestClient
):
    # The real S3Helper.upload_file streams the body to S3, leaving the
    # UploadFile's underlying buffer consumed/closed. Reproduce that here so the
    # size must be read *before* the upload, not after.
    def consume_and_close(file_obj, *_args, **_kwargs):
        file_obj.read()
        file_obj.close()

    mock_upload_file.side_effect = consume_and_close

    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("notes.txt", b"hello world")},
    )
    assert response.status_code == 201
    assert response.json()["current_version"]["size"] == len(b"hello world")


def test_rename_file(client: TestClient):
    response = client.patch("/api/v1/files/2", json={"name": "Suite 2021"})
    assert response.status_code == 200
    assert response.json() == {
        "id": 2,
        "name": "Suite 2021",
        "parent_id": 1,
        "type": "DIR",
        "current_version": None,
        "child_count": None,
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": None,
        "modified_at": ANY,
        "modifier": ANY,
    }


def test_rename_file_name_collision(client: TestClient):
    client.post("/api/v1/files/1", json={"name": "taken"})
    response = client.patch("/api/v1/files/2", json={"name": "taken"})
    assert response.status_code == 409


def test_update_file_requires_a_field(client: TestClient):
    response = client.patch("/api/v1/files/2", json={})
    assert response.status_code == 422


def test_delete_file(client: TestClient):
    response = client.delete("/api/v1/files/1")
    assert response.status_code == 204
    assert response.content == b""


def test_move_file(client: TestClient):
    response = client.patch("/api/v1/files/3", json={"parent_id": 2})
    assert response.status_code == 200
    assert response.json()["parent_id"] == 2

    children = client.get("/api/v1/files/2/children").json()
    assert [child["id"] for child in children] == [3]


def test_rename_and_move_atomically(client: TestClient):
    client.post("/api/v1/files/2", json={"name": "file2"})
    response = client.patch("/api/v1/files/3", json={"name": "renamed", "parent_id": 2})
    assert response.status_code == 200
    assert response.json()["name"] == "renamed"
    assert response.json()["parent_id"] == 2


def test_move_file_target_not_found(client: TestClient):
    response = client.patch("/api/v1/files/3", json={"parent_id": 999})
    assert response.status_code == 404


def test_update_file_source_not_found(client: TestClient):
    response = client.patch("/api/v1/files/999", json={"parent_id": 1})
    assert response.status_code == 404


def test_move_file_into_itself(client: TestClient):
    response = client.patch("/api/v1/files/2", json={"parent_id": 2})
    assert response.status_code == 400


def test_move_folder_into_descendant(client: TestClient):
    sub = client.post("/api/v1/files/2", json={"name": "sub"}).json()
    response = client.patch("/api/v1/files/2", json={"parent_id": sub["id"]})
    assert response.status_code == 400


def test_move_root_is_forbidden(client: TestClient):
    response = client.patch("/api/v1/files/1", json={"parent_id": 2})
    assert response.status_code == 400


def test_move_target_not_a_folder(client: TestClient):
    with patch("bbe2.utils.s3.S3Helper.upload_file"):
        uploaded = client.post(
            "/api/v1/files/1/upload",
            files={"file": (files("tests.assets") / "lena.jpg").open("rb")},
        ).json()
    response = client.patch("/api/v1/files/2", json={"parent_id": uploaded["id"]})
    assert response.status_code == 400


def test_move_name_collision(client: TestClient):
    dup_in_2 = client.post("/api/v1/files/2", json={"name": "dup"}).json()
    client.post("/api/v1/files/3", json={"name": "dup"})
    response = client.patch(f"/api/v1/files/{dup_in_2['id']}", json={"parent_id": 3})
    assert response.status_code == 409


@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_mscz_creates_pending_container(
    mock_upload_file: MagicMock, mock_service: MagicMock, client: TestClient
):
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("Bro Goz.mscz", b"fake-mscz-bytes")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "CONTAINER"
    assert body["source_format"] == "mscz"
    assert body["processing_status"] == "pending"
    mock_service.return_value.generate.assert_called_once_with(body["id"])


@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_plain_file_stays_file(
    mock_upload_file: MagicMock, mock_service: MagicMock, client: TestClient
):
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("notes.txt", b"hello")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "FILE"
    assert body["source_format"] is None
    assert body["processing_status"] is None


@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_ds_stays_file_without_renderer(
    mock_upload_file: MagicMock, mock_service: MagicMock, client: TestClient
):
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("Kas a barh.ds", b"fake-ds")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "FILE"
    assert body["source_format"] is None
    assert body["processing_status"] is None
    mock_service.return_value.generate.assert_not_called()


@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_ds_creates_container_with_renderer(
    mock_upload_file: MagicMock, mock_service: MagicMock, client: TestClient
):
    def settings_with_drumscore():
        settings = get_fake_settings()
        settings.drumscore_renderer_url = "http://drumscore:8080"
        return settings

    app.dependency_overrides[get_settings] = settings_with_drumscore
    try:
        response = client.post(
            "/api/v1/files/1/upload",
            files={"file": ("Kas a barh.ds", b"fake-ds")},
        )
    finally:
        app.dependency_overrides[get_settings] = get_fake_settings

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "CONTAINER"
    assert body["source_format"] == "ds"
    assert body["processing_status"] == "pending"
    mock_service.return_value.generate.assert_called_once_with(body["id"])


def _make_container(client: TestClient) -> int:
    with patch("bbe2.services.files.ConversionService"), patch(
        "bbe2.utils.s3.S3Helper.upload_file"
    ):
        response = client.post(
            "/api/v1/files/1/upload",
            files={"file": ("Suite.mscz", b"fake-mscz")},
        )
    return response.json()["id"]


@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_upload_into_container_is_forbidden(
    mock_upload_file: MagicMock, client: TestClient
):
    container_id = _make_container(client)
    response = client.post(
        f"/api/v1/files/{container_id}/upload",
        files={"file": ("x.pdf", b"data")},
    )
    assert response.status_code == 403


@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_reupload_container_requires_force(
    mock_upload_file: MagicMock, mock_service: MagicMock, client: TestClient
):
    _make_container(client)
    response = client.post(
        "/api/v1/files/1/upload",
        files={"file": ("Suite.mscz", b"new-bytes")},
    )
    assert response.status_code == 409
    mock_service.return_value.generate.assert_not_called()


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.services.files.ConversionService")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_reupload_container_with_force_regenerates(
    mock_upload_file: MagicMock,
    mock_service: MagicMock,
    mock_delete: MagicMock,
    client: TestClient,
):
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    container_id = _make_container(client)
    engine = get_engine(DATABASE_URL)
    session = sessionmaker(bind=engine)()
    session.add(
        stored_file(
            "files/old-pdf",
            type=FileOrFolderType.FILE,
            name="Suite.pdf",
            parent_id=container_id,
        )
    )
    session.commit()
    session.close()

    response = client.post(
        "/api/v1/files/1/upload?force=true",
        files={"file": ("Suite.mscz", b"new-bytes")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == container_id
    assert body["type"] == "CONTAINER"
    assert body["processing_status"] == "pending"
    mock_service.return_value.generate.assert_called_once_with(container_id)
    mock_delete.assert_any_call("files/old-pdf")

    session = sessionmaker(bind=engine)()
    children = (
        session.query(m.FileOrFolderDB)
        .filter(m.FileOrFolderDB.parent_id == container_id)
        .all()
    )
    session.close()
    assert children == []


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_reupload_container_commits_new_source_before_generate(
    mock_upload_file: MagicMock,
    mock_delete: MagicMock,
    client: TestClient,
):
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    container_id = _make_container(client)
    engine = get_engine(DATABASE_URL)
    session = sessionmaker(bind=engine)()
    session.add(
        stored_file(
            "files/old-pdf",
            type=FileOrFolderType.FILE,
            name="Suite.pdf",
            parent_id=container_id,
        )
    )
    container = session.get(m.FileOrFolderDB, container_id)
    old_version_id = container.current_version_id
    session.commit()
    session.close()

    seen: dict = {}

    def capture(cid: int) -> None:
        probe = sessionmaker(bind=engine)()
        node = probe.get(m.FileOrFolderDB, cid)
        children = (
            probe.query(m.FileOrFolderDB)
            .filter(m.FileOrFolderDB.parent_id == cid)
            .all()
        )
        seen["current_version_id"] = node.current_version_id
        seen["processing_status"] = node.processing_status
        seen["child_count"] = len(children)
        probe.close()

    with patch("bbe2.services.files.ConversionService") as mock_service:
        mock_service.return_value.generate.side_effect = capture
        response = client.post(
            "/api/v1/files/1/upload?force=true",
            files={"file": ("Suite.mscz", b"new-bytes")},
        )

    assert response.status_code == 201
    assert seen["processing_status"] == "pending"
    assert seen["current_version_id"] != old_version_id
    assert seen["child_count"] == 0


def test_create_folder_in_container_is_forbidden(client: TestClient):
    container_id = _make_container(client)
    response = client.post(f"/api/v1/files/{container_id}", json={"name": "sub"})
    assert response.status_code == 403


@patch("bbe2.utils.s3.S3Helper.delete_object")
def test_container_child_cannot_be_modified_or_deleted(
    mock_delete: MagicMock, client: TestClient
):
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    container_id = _make_container(client)
    engine = get_engine(DATABASE_URL)
    session = sessionmaker(bind=engine)()
    child = stored_file(
        "files/child",
        type=FileOrFolderType.FILE,
        name="Suite.pdf",
        parent_id=container_id,
    )
    session.add(child)
    session.commit()
    child_id = child.id
    session.close()

    update = client.patch(
        f"/api/v1/files/{child_id}",
        json={"name": "renamed.pdf"},
    )
    assert update.status_code == 403

    delete = client.delete(f"/api/v1/files/{child_id}")
    assert delete.status_code == 403


@patch("bbe2.utils.s3.S3Helper.delete_object")
def test_delete_container_cascades_s3(mock_delete: MagicMock, client: TestClient):
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    container_id = _make_container(client)
    engine = get_engine(DATABASE_URL)
    session = sessionmaker(bind=engine)()
    container = session.get(m.FileOrFolderDB, container_id)
    container.current_version.file_key = "files/source"
    for key in ("files/pdf-a", "files/pdf-b"):
        session.add(
            stored_file(
                key,
                type=FileOrFolderType.FILE,
                name=key,
                parent_id=container_id,
            )
        )
    session.commit()
    session.close()

    response = client.delete(f"/api/v1/files/{container_id}")
    assert response.status_code == 204

    deleted_keys = {call.args[0] for call in mock_delete.call_args_list}
    assert {"files/source", "files/pdf-a", "files/pdf-b"} <= deleted_keys


def test_list_files_with_type_file_hides_container_shows_generated_pdfs(
    client: TestClient,
):
    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    container_id = _make_container(client)
    engine = get_engine(DATABASE_URL)
    session = sessionmaker(bind=engine)()
    container = session.get(m.FileOrFolderDB, container_id)
    container.name = "Bro Goz.mscz"
    session.add(
        stored_file(
            "files/pdf",
            type=FileOrFolderType.FILE,
            name="Bro Goz.pdf",
            parent_id=container_id,
        )
    )
    session.add(
        stored_file(
            "files/plain",
            type=FileOrFolderType.FILE,
            name="Reglement.pdf",
            parent_id=1,
        )
    )
    session.commit()
    session.close()

    response = client.get("/api/v1/files/?t=FILE")
    assert response.status_code == 200
    names = {item["name"] for item in response.json()}
    assert "Bro Goz.pdf" in names
    assert "Reglement.pdf" in names
    assert "Bro Goz.mscz" not in names


def _upload_two_versions(client: TestClient) -> int:
    with patch("bbe2.utils.s3.S3Helper.upload_file"):
        file_id = client.post(
            "/api/v1/files/1/upload",
            files={"file": ("notes.txt", b"v1")},
        ).json()["id"]
        client.post(
            "/api/v1/files/1/upload?force=true",
            files={"file": ("notes.txt", b"v2")},
        )
    return file_id


def test_list_versions_of_unknown_file_is_404(client: TestClient):
    assert client.get("/api/v1/files/999/versions").status_code == 404


@patch("bbe2.utils.s3.S3Helper.generate_get_presigned_url", return_value="https://s3/x")
def test_download_previous_version_redirects_with_versioned_name(
    mock_presign: MagicMock, client: TestClient
):
    file_id = _upload_two_versions(client)
    versions = client.get(f"/api/v1/files/{file_id}/versions").json()
    previous = versions[1]

    response = client.get(
        f"/api/v1/files/{file_id}/versions/{previous['id']}/download",
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == "https://s3/x"
    assert mock_presign.call_args.kwargs["filename"] == "notes (v1).txt"
    assert mock_presign.call_args.kwargs["disposition"] == "attachment"
    assert mock_presign.call_args.kwargs["object_name"].endswith("-v1")


def test_download_version_of_another_file_is_404(client: TestClient):
    file_id = _upload_two_versions(client)
    version_id = client.get(f"/api/v1/files/{file_id}/versions").json()[0]["id"]

    response = client.get(
        f"/api/v1/files/2/versions/{version_id}/download", follow_redirects=False
    )

    assert response.status_code == 404


def test_download_purged_version_is_410(client: TestClient):
    from datetime import datetime, timezone

    from sqlalchemy.orm import sessionmaker

    from bbe2 import models as m
    from bbe2.database import get_engine

    file_id = _upload_two_versions(client)
    previous_id = client.get(f"/api/v1/files/{file_id}/versions").json()[1]["id"]
    session = sessionmaker(bind=get_engine(DATABASE_URL))()
    session.get(m.FileVersionDB, previous_id).purged_at = datetime.now(timezone.utc)
    session.commit()
    session.close()

    response = client.get(
        f"/api/v1/files/{file_id}/versions/{previous_id}/download",
        follow_redirects=False,
    )

    assert response.status_code == 410
    versions = client.get(f"/api/v1/files/{file_id}/versions").json()
    assert versions[1]["purged_at"] is not None


@patch("bbe2.utils.s3.S3Helper.delete_object")
def test_delete_file_deletes_every_stored_version(
    mock_delete: MagicMock, client: TestClient
):
    file_id = _upload_two_versions(client)

    assert client.delete(f"/api/v1/files/{file_id}").status_code == 204

    deleted = sorted(call.args[0][-3:] for call in mock_delete.call_args_list)
    assert deleted == ["-v1", "-v2"]
