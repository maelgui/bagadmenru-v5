from datetime import date, datetime, timedelta, timezone
from typing import Generator
from unittest.mock import patch

import bbe2.utils.auth
import jwt
import pytest
from bbe2 import models
from bbe2.config import Settings, get_settings
from bbe2.database import get_engine
from bbe2.main import app
from bbe2.models.base import Base
from bbe2.schemas import Costume, FileOrFolderType
from bbe2.schemas.auth import JwtPayload
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker


def populate_db(session):
    # Profile
    instrument = models.GroupDB(id=1, name="Piccolo", color="#fff")
    session.merge(instrument)
    user = models.UserDB(
        id="a8e2d3249e9d997e",
        email="john.doe@example.com",
        first_name="john",
        last_name="doe",
        instrument_id=1,
        # picture_key="blbabla.jpg",
    )
    session.merge(user)
    # Events
    event = models.EventDB(
        id=1,
        title="Saint Nicolas",
        description="Rendez-vous 14h au parc",
        date=date(2022, 12, 9),
        costume=Costume.COSTUME,
        category="TEST",
        is_in_doodle=True,
    )
    session.merge(event)
    response = models.ResponseDB(
        value=True,
        date=datetime(2024, 1, 1),
        event_id=event.id,
        user_id=user.id,
    )
    session.merge(response)
    # Files
    root = models.FileOrFolderDB(
        id=1,
        type=FileOrFolderType.DIRECTORY,
        name="root",
    )
    file1 = models.FileOrFolderDB(
        id=2,
        type=FileOrFolderType.DIRECTORY,
        name="file1",
        parent_id=1,
    )
    file2 = models.FileOrFolderDB(
        id=3,
        type=FileOrFolderType.DIRECTORY,
        name="file2",
        parent_id=1,
    )
    session.merge(root)
    session.merge(file1)
    session.merge(file2)
    session.commit()


DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"


def get_fake_settings():
    return Settings.model_validate(
        {
            "database_url": DATABASE_URL,
            "s3_endpoint": "https://mys3.example.com/",
            "s3_access_key_id": "blabla",
            "s3_secret_access_key": "blabla",
            "s3_bucket_name": "testbucket",
            "token_secret_key": "fakesecretkey",
            "jwt_secret_key": "myjwtsecretkey",
        }
    )


def fake_is_allowed(roles, action, resource) -> bool:
    """Always allow in tests."""
    return True


@pytest.fixture()
def client(monkeypatch) -> Generator:

    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        populate_db(session)
    app.dependency_overrides[get_settings] = get_fake_settings
    monkeypatch.setattr(bbe2.utils.auth, "is_allowed", fake_is_allowed)

    payload = JwtPayload(
        sub="a8e2d3249e9d997e",
        roles=[],
        first_name="Mael",
        last_name="Gui",
        exp=datetime.now(tz=timezone.utc) + timedelta(minutes=5),
        iat=datetime.now(tz=timezone.utc),
    ).model_dump()
    access_token = jwt.encode(
        payload, get_fake_settings().jwt_secret_key, algorithm="HS256"
    )

    with patch("bbe2.main.scheduler") as p:
        with TestClient(app) as cli:
            cli.headers = {"Authorization": f"Bearer {access_token}"}
            yield cli
