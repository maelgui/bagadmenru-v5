from datetime import date
from typing import Generator

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.config import Settings, get_settings
from bbe2.database import Base, get_engine
from bbe2.main import app
from bbe2.schemas import Costume, FileOrFolderType
from bbe2.utils.auth import get_current_user


def populate_db(session):
    # Profile
    instrument = models.Group(id=1, name="Piccolo", color="#fff")
    session.merge(instrument)
    user = models.Profile(
        id="a8e2d3249e9d997e",
        email="john.doe@example.com",
        first_name="john",
        last_name="doe",
        instrument_id=1,
        password=bcrypt.hashpw(b"blabla", bcrypt.gensalt()),
        # picture_key="blbabla.jpg",
    )
    session.merge(user)
    # Albums
    album = models.Album(
        id=1,
        title="Mon Album",
        date=date(2022, 6, 3),
    )
    session.merge(album)
    # Events
    event = models.Event(
        id=1,
        title="Saint Nicolas",
        description="Rendez-vous 14h au parc",
        date=date(2022, 12, 9),
        costume=Costume.COSTUME,
        category="TEST",
        is_in_doodle=True,
    )
    session.merge(event)
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
    session.merge(root)
    session.merge(file1)
    session.merge(file2)
    session.commit()


def get_fake_user():
    return "a8e2d3249e9d997e"


DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def get_fake_settings():
    return Settings(
        database_url=DATABASE_URL,
        s3_endpoint="https://mys3.example.com/",
        s3_access_key_id="blabla",
        s3_secret_access_key="blabla",
        s3_bucket_name="testbucket",
        secret_key="mysecretkey",
    )


@pytest.fixture(scope="session")
def client() -> Generator:

    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        populate_db(session)
    app.dependency_overrides[get_settings] = get_fake_settings
    app.dependency_overrides[get_current_user] = get_fake_user
    with TestClient(app) as cli:
        yield cli
