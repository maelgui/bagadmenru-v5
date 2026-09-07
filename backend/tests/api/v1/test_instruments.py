"""Tests for the public instrument list (api/v1/endpoints/instruments).

Instrument groups are reference data reused by several forms (signup, admin
profile create/edit). The endpoint is public and returns only the minimal group
shape, filtered to ``is_instrument`` groups.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2.database import get_engine
from bbe2.models.user import GroupDB

DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def test_list_instruments_is_public_and_filters_on_is_instrument(client: TestClient):
    # Flag the seeded group id=1 "Piccolo" as an instrument and add a
    # non-instrument group that must NOT appear.
    with _session() as s:
        s.get(GroupDB, 1).is_instrument = True
        s.merge(GroupDB(id=90, name="Staff", color="#333", is_instrument=False))
        s.commit()

    # No auth header: the endpoint must be reachable publicly.
    resp = client.get("/api/v1/instruments")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # The instrument group is present; the non-instrument group is not.
    assert any(g["id"] == 1 and g["name"] == "Piccolo" for g in data)
    assert all(g["id"] != 90 for g in data)
    # Frozen public surface: exactly these fields, nothing more. This guards
    # against a future change widening the unauthenticated response (e.g. by
    # editing a shared group schema). Adding a field here must be a deliberate
    # edit to PublicInstrument, which breaks this assertion on purpose.
    for g in data:
        assert set(g) == {"id", "name", "color"}
