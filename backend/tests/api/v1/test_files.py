from importlib.resources import files, open_binary
from unittest.mock import ANY, MagicMock, patch

from fastapi.testclient import TestClient

from bbe2.config import get_settings
from bbe2.main import app
from bbe2.schemas import FileOrFolderType
from tests.conftest import DATABASE_URL, get_fake_settings


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
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": None,
        "modified_at": None,
        "modifier": None,
        "size": None,
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
            "source_format": None,
            "processing_status": None,
            "processing_failure_reason": None,
            "uploaded_at": ANY,
            "uploader": None,
            "modified_at": None,
            "modifier": None,
            "size": None,
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
            "source_format": None,
            "processing_status": None,
            "processing_failure_reason": None,
            "uploaded_at": ANY,
            "uploader": None,
            "modified_at": None,
            "modifier": None,
            "size": None,
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
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": ANY,
        "modified_at": None,
        "modifier": None,
        "size": ANY,
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
    assert body["size"] == len(b"hello world")
    assert body["modified_at"] is None


@patch("bbe2.utils.s3.S3Helper.delete_object")
@patch("bbe2.utils.s3.S3Helper.upload_file")
def test_force_reupload_file_updates_in_place(
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

    # Same entity (id preserved), new content (file_key rotated to bust the
    # immutable cache), modification stamped, original upload metadata kept.
    assert updated["id"] == original["id"]
    assert updated["file_key"] != original["file_key"]
    assert updated["size"] == len(b"v2-longer")
    assert updated["uploaded_at"] == original["uploaded_at"]
    assert updated["modified_at"] is not None
    assert updated["modifier"]["name"] == "john doe"
    # The previous S3 object is cleaned up.
    mock_delete.assert_called_once_with(original["file_key"])


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
    assert response.json()["size"] == len(b"hello world")


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
        "source_format": None,
        "processing_status": None,
        "processing_failure_reason": None,
        "uploaded_at": ANY,
        "uploader": None,
        "modified_at": ANY,
        "modifier": ANY,
        "size": None,
    }


def test_delete_file(client: TestClient):
    response = client.delete("/api/v1/files/1")
    assert response.status_code == 204
    assert response.content == b""


@patch("bbe2.api.v1.endpoints.files.ConversionService")
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


@patch("bbe2.api.v1.endpoints.files.ConversionService")
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


@patch("bbe2.api.v1.endpoints.files.ConversionService")
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


@patch("bbe2.api.v1.endpoints.files.ConversionService")
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
    with patch("bbe2.api.v1.endpoints.files.ConversionService"), patch(
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


@patch("bbe2.api.v1.endpoints.files.ConversionService")
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
@patch("bbe2.api.v1.endpoints.files.ConversionService")
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
        m.FileOrFolderDB(
            type=FileOrFolderType.FILE,
            name="Suite.pdf",
            file_key="files/old-pdf",
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
        m.FileOrFolderDB(
            type=FileOrFolderType.FILE,
            name="Suite.pdf",
            file_key="files/old-pdf",
            parent_id=container_id,
        )
    )
    container = session.get(m.FileOrFolderDB, container_id)
    old_key = container.file_key
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
        seen["file_key"] = node.file_key
        seen["processing_status"] = node.processing_status
        seen["child_count"] = len(children)
        probe.close()

    with patch("bbe2.api.v1.endpoints.files.ConversionService") as mock_service:
        mock_service.return_value.generate.side_effect = capture
        response = client.post(
            "/api/v1/files/1/upload?force=true",
            files={"file": ("Suite.mscz", b"new-bytes")},
        )

    assert response.status_code == 201
    assert seen["processing_status"] == "pending"
    assert seen["file_key"] != old_key
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
    child = m.FileOrFolderDB(
        type=FileOrFolderType.FILE,
        name="Suite.pdf",
        file_key="files/child",
        parent_id=container_id,
    )
    session.add(child)
    session.commit()
    child_id = child.id
    session.close()

    update = client.put(
        f"/api/v1/files/{child_id}",
        json={"name": "renamed.pdf", "parent_id": container_id},
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
    container.file_key = "files/source"
    for key in ("files/pdf-a", "files/pdf-b"):
        session.add(
            m.FileOrFolderDB(
                type=FileOrFolderType.FILE,
                name=key,
                file_key=key,
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
        m.FileOrFolderDB(
            type=FileOrFolderType.FILE,
            name="Bro Goz.pdf",
            file_key="files/pdf",
            parent_id=container_id,
        )
    )
    session.add(
        m.FileOrFolderDB(
            type=FileOrFolderType.FILE,
            name="Reglement.pdf",
            file_key="files/plain",
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
