from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.models.base import Base
from bbe2.schemas import FileOrFolderType
from bbe2.services.files import purge_superseded_versions
from tests.conftest import DATABASE_URL, stored_file

NOW = datetime(2026, 10, 20, 4, 0, tzinfo=timezone.utc)


@pytest.fixture()
def session():
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with sessionmaker(bind=engine)() as s:
        s.add(models.FileOrFolderDB(id=1, type=FileOrFolderType.DIRECTORY, name="root"))
        s.commit()
        yield s


def _file_with_versions(
    session, superseded_ages_days: list[int]
) -> models.FileOrFolderDB:
    node = stored_file(
        "files/a-v1", type=FileOrFolderType.FILE, name="a.pdf", parent_id=1
    )
    for _ in superseded_ages_days:
        node.add_version(size=None, uploaded_by=None)
    for version, age in zip(
        sorted(node.versions, key=lambda v: v.number), superseded_ages_days
    ):
        version.superseded_at = NOW - timedelta(days=age)
    session.add(node)
    session.commit()
    return node


def test_purges_only_versions_superseded_beyond_retention(session):
    node = _file_with_versions(session, [400, 10])
    s3 = MagicMock()

    purged = purge_superseded_versions(session, s3, retention_days=365, now=NOW)

    assert purged == 1
    s3.delete_object.assert_called_once_with("files/a-v1")
    by_number = {v.number: v for v in node.versions}
    assert by_number[1].purged_at is not None
    assert by_number[2].purged_at is None
    assert by_number[3].purged_at is None
    assert by_number[3].superseded_at is None


def test_purge_keeps_the_version_row_and_does_not_purge_twice(session):
    node = _file_with_versions(session, [400])
    s3 = MagicMock()

    purge_superseded_versions(session, s3, retention_days=365, now=NOW)
    second = purge_superseded_versions(session, s3, retention_days=365, now=NOW)

    assert second == 0
    assert s3.delete_object.call_count == 1
    assert len(node.versions) == 2
