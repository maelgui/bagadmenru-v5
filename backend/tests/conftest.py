import logging
from datetime import date
from typing import Annotated, Generator

import pytest
from fastapi import Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from bbe2 import models
from bbe2.database import Base
from bbe2.dependencies.auth import get_current_user
from bbe2.dependencies.db import get_db, make_get_db
from bbe2.main import app
from bbe2.schemas import Costume, FileOrFolderType


def populate_db(session):
    # Profile
    instrument = models.Instrument(id=1, name="Piccolo", color="#fff")
    session.add(instrument)
    user = models.Profile(
        id="a8e2d3249e9d997e",
        email="john.doe@example.com",
        first_name="john",
        last_name="doe",
        instrument_id=1,
    )
    session.add(user)
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


def get_fake_user():
    logging.info("blablebfwj")
    return {"sub": "a8e2d3249e9d997e"}


@pytest.fixture(scope="session")
def client() -> Generator:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    populate_db(TestingSessionLocal())
    app.dependency_overrides[get_db] = make_get_db(TestingSessionLocal)
    app.dependency_overrides[get_current_user] = get_fake_user
    with TestClient(app) as cli:
        yield cli
