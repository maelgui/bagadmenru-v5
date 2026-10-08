import base64
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.models.base import Base
from bbe2.schemas import FileOrFolderType
from bbe2.services.conversion import ConversionService
from tests.conftest import DATABASE_URL, get_fake_settings


def _pdf(name: str) -> dict:
    return {"name": name, "content_b64": base64.b64encode(b"%PDF-1.4").decode("ascii")}


def _mp3(name: str) -> dict:
    return {"name": name, "content_b64": base64.b64encode(b"ID3\x03").decode("ascii")}


@pytest.fixture()
def session():
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    maker = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with maker() as s:
        root = models.FileOrFolderDB(id=1, type=FileOrFolderType.DIRECTORY, name="root")
        s.add(root)
        s.commit()
        yield s


def _make_container(session, file_key: str = "files/source") -> int:
    container = models.FileOrFolderDB(
        type=FileOrFolderType.CONTAINER,
        name="Suite.mscz",
        file_key=file_key,
        parent_id=1,
        source_format="mscz",
        processing_status="pending",
    )
    session.add(container)
    session.commit()
    return container.id


def _service() -> ConversionService:
    s3 = MagicMock()
    s3.client.download_fileobj = MagicMock()
    settings = get_fake_settings()
    settings.musescore_renderer_url = "http://musescore:8080"
    return ConversionService(settings, s3)


def test_duplicate_part_names_are_disambiguated(session):
    container_id = _make_container(session)
    service = _service()
    with patch.object(service, "_download", return_value=b"<score/>"), patch(
        "bbe2.services.conversion.httpx.post"
    ) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"outputs": [_pdf("Partie.pdf"), _pdf("Partie.pdf")]},
        )
        service._run(container_id)

    children = (
        session.query(models.FileOrFolderDB)
        .filter(models.FileOrFolderDB.parent_id == container_id)
        .order_by(models.FileOrFolderDB.id)
        .all()
    )
    names = [c.name for c in children]
    assert names == ["Partie.pdf", "Partie (1).pdf"]
    container = session.get(models.FileOrFolderDB, container_id)
    assert container.processing_status == "completed"


def test_stale_run_discards_results_when_source_changed(session):
    container_id = _make_container(session, file_key="files/old-source")
    service = _service()

    def swap_source(_source_key: str) -> bytes:
        container = session.get(models.FileOrFolderDB, container_id)
        container.file_key = "files/new-source"
        session.commit()
        return b"<score/>"

    with patch.object(service, "_download", side_effect=swap_source), patch(
        "bbe2.services.conversion.httpx.post"
    ) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"outputs": [_pdf("Partie.pdf")]},
        )
        service._run(container_id)

    children = (
        session.query(models.FileOrFolderDB)
        .filter(models.FileOrFolderDB.parent_id == container_id)
        .all()
    )
    assert children == []
    service.s3.delete_object.assert_called()


def test_pdf_and_mp3_outputs_uploaded_with_correct_content_types(session):
    container_id = _make_container(session)
    service = _service()
    with patch.object(service, "_download", return_value=b"<score/>"), patch(
        "bbe2.services.conversion.httpx.post"
    ) as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"outputs": [_pdf("Suite.pdf"), _mp3("Suite.mp3")]},
        )
        service._run(container_id)

    children = (
        session.query(models.FileOrFolderDB)
        .filter(models.FileOrFolderDB.parent_id == container_id)
        .order_by(models.FileOrFolderDB.id)
        .all()
    )
    assert [c.name for c in children] == ["Suite.pdf", "Suite.mp3"]

    content_types = {
        call.kwargs["content_type"] for call in service.s3.upload_file.call_args_list
    }
    assert content_types == {"application/pdf", "audio/mpeg"}

    container = session.get(models.FileOrFolderDB, container_id)
    assert container.processing_status == "completed"
