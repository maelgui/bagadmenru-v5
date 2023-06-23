from datetime import date
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from bbe2 import models
from bbe2.database import Base
from bbe2.dependencies.db import get_db, make_get_db
from bbe2.main import app
from bbe2.schemas import Costume, FileOrFolderType


def populate_db(session):
    # Albums
    album = models.Album(
        id=1,
        title="Mon Album",
        date=date(2022, 6, 3),
    )
    session.add(album)
    # Events
    event = models.Event(
        id=1,
        title="Saint Nicolas",
        description="Rendez-vous 14h au parc",
        date=date(2022, 12, 9),
        costume=Costume.COSTUME,
    )
    session.add(event)
    # Files
    root = models.FileOrFolder(
        id=1,
        type=FileOrFolderType.DIRECTORY,
        name="root",
        is_root=True,
    )
    file1 = models.FileOrFolder(
        id=2,
        type=FileOrFolderType.DIRECTORY,
        name="file1",
        parent_id=1,
    )
    file2 = models.FileOrFolder(
        id=3,
        type=FileOrFolderType.DIRECTORY,
        name="file2",
        parent_id=1,
    )
    session.add(root)
    session.add(file1)
    session.add(file2)
    session.commit()


@pytest.fixture(scope="session")
def client() -> Generator:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    populate_db(TestingSessionLocal())
    app.dependency_overrides[get_db] = make_get_db(TestingSessionLocal)
    with TestClient(app) as cli:
        yield cli
