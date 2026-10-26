from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.schemas import FileAccessAction, FileOrFolderType
from tests.conftest import DATABASE_URL, stored_file

SEEDED_USER_ID = "a8e2d3249e9d997e"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _add_file(file_id: int, name: str, parent_id: int, uploaded_at=None) -> None:
    with _session() as session:
        session.add(
            stored_file(
                f"files/{file_id}",
                id=file_id,
                type=FileOrFolderType.FILE,
                name=name,
                parent_id=parent_id,
                uploaded_at=uploaded_at or datetime.now(timezone.utc),
            )
        )
        session.commit()


def _add_access(file_id: int, user_id, action: str, at: datetime) -> None:
    with _session() as session:
        session.add(
            models.FileAccessDB(
                file_id=file_id,
                user_id=user_id,
                action=FileAccessAction(action),
                at=at,
            )
        )
        session.commit()


def _add_member(user_id: str, instrument_id: int) -> None:
    with _session() as session:
        session.add(
            models.UserDB(
                id=user_id,
                email=f"{user_id}@example.com",
                first_name="x",
                last_name="y",
                instrument_id=instrument_id,
            )
        )
        session.commit()


def test_download_records_access_and_redirects(client: TestClient):
    _add_file(10, "partition.pdf", parent_id=2)
    resp = client.get("/api/v1/files/10/download", follow_redirects=False)
    assert resp.status_code == 307
    assert "attachment" in resp.headers["location"] or resp.headers["location"]
    assert resp.headers["cache-control"] == "no-store"

    with _session() as session:
        rows = session.query(models.FileAccessDB).filter_by(file_id=10).all()
    assert len(rows) == 1
    assert rows[0].user_id == SEEDED_USER_ID
    assert rows[0].action.value == "DOWNLOAD"


def test_view_records_access_and_redirects(client: TestClient):
    _add_file(11, "partition.pdf", parent_id=2)
    resp = client.get("/api/v1/files/11/view", follow_redirects=False)
    assert resp.status_code == 307
    assert resp.headers["location"]

    with _session() as session:
        rows = session.query(models.FileAccessDB).filter_by(file_id=11).all()
    assert len(rows) == 1
    assert rows[0].action.value == "VIEW"


def test_view_unknown_file_404(client: TestClient):
    resp = client.get("/api/v1/files/9999/view", follow_redirects=False)
    assert resp.status_code == 404


def test_suggestions_recent_rail_falls_back_without_access(client: TestClient):
    _add_file(20, "neuf.pdf", parent_id=2)
    resp = client.get("/api/v1/files/suggestions")
    assert resp.status_code == 200
    by_id = {s["file"]["id"]: s for s in resp.json()}
    assert 20 in by_id
    assert by_id[20]["reason"] == "RECENT"


def test_suggestions_trending_ranks_recent_access_higher(client: TestClient):
    now = datetime.now(timezone.utc)
    _add_file(30, "vieux.pdf", parent_id=2)
    _add_file(31, "chaud.pdf", parent_id=2)
    # vieux: accessed 20 days ago (heavily decayed)
    _add_access(30, SEEDED_USER_ID, "VIEW", now - timedelta(days=20))
    # chaud: accessed many times this week
    for _ in range(5):
        _add_access(31, SEEDED_USER_ID, "VIEW", now - timedelta(hours=2))

    resp = client.get("/api/v1/files/suggestions")
    assert resp.status_code == 200
    ids = [s["file"]["id"] for s in resp.json()]
    assert 31 in ids and 30 in ids
    assert ids.index(31) < ids.index(30)


def test_suggestions_scoped_to_folder_subtree(client: TestClient):
    now = datetime.now(timezone.utc)
    # file1 (id=2) and file2 (id=3) are sibling folders under root in the seed.
    _add_file(40, "dans-file1.pdf", parent_id=2)
    _add_file(41, "dans-file2.pdf", parent_id=3)
    _add_access(40, SEEDED_USER_ID, "VIEW", now)
    _add_access(41, SEEDED_USER_ID, "VIEW", now)

    resp = client.get("/api/v1/files/suggestions", params={"folder_id": 2})
    assert resp.status_code == 200
    all_ids = {s["file"]["id"] for s in resp.json()}
    assert 40 in all_ids
    assert 41 not in all_ids


def test_suggestions_empty_folder_returns_nothing(client: TestClient):
    # file2 (id=3) subtree has no files seeded here.
    resp = client.get("/api/v1/files/suggestions", params={"folder_id": 3})
    assert resp.status_code == 200
    assert resp.json() == []


def test_suggestions_group_reason_names_the_group(client: TestClient):
    now = datetime.now(timezone.utc)
    # The seeded user is in instrument 1 ("Piccolo"); add two more so the
    # group reaches the 3-member anonymity threshold.
    _add_member("member2", instrument_id=1)
    _add_member("member3", instrument_id=1)
    _add_file(50, "partition-piccolo.pdf", parent_id=2)
    # Accesses from the group's members make this file a group favourite.
    _add_access(50, SEEDED_USER_ID, "VIEW", now)
    _add_access(50, "member2", "VIEW", now)
    _add_access(50, "member3", "VIEW", now)

    resp = client.get("/api/v1/files/suggestions")
    assert resp.status_code == 200
    by_id = {s["file"]["id"]: s for s in resp.json()}
    assert 50 in by_id
    assert by_id[50]["reason"] == "GROUP"
    assert by_id[50]["group_name"] == "Piccolo"


def test_suggestions_group_below_threshold_is_not_group(client: TestClient):
    now = datetime.now(timezone.utc)
    # Only the seeded user is in the group (< 3 members): the file still shows
    # up (trending), but not with a GROUP reason.
    _add_file(60, "solo.pdf", parent_id=2)
    _add_access(60, SEEDED_USER_ID, "VIEW", now)

    resp = client.get("/api/v1/files/suggestions")
    assert resp.status_code == 200
    by_id = {s["file"]["id"]: s for s in resp.json()}
    assert 60 in by_id
    assert by_id[60]["reason"] != "GROUP"
