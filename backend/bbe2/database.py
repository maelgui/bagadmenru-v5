import unicodedata
from contextlib import contextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from bbe2.config import Settings, get_settings

SessionLocal = sessionmaker(autocommit=False, autoflush=False)


def strip_accents(value: str | None) -> str | None:
    if value is None:
        return None
    decomposed = unicodedata.normalize("NFKD", value)
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def _register_sqlite_unaccent(dbapi_connection, _connection_record) -> None:
    dbapi_connection.create_function("unaccent", 1, strip_accents)


@lru_cache
def get_engine(url: str):
    engine = create_engine(url)
    # Postgres provides unaccent() through its extension (see the Alembic
    # migration); SQLite, used by the unit tests, gets a Python equivalent so
    # the search service runs the same SQL on both.
    if engine.dialect.name == "sqlite":
        event.listen(engine, "connect", _register_sqlite_unaccent)
    return engine


def get_session(settings: Annotated[Settings, Depends(get_settings)]):
    engine = get_engine(settings.database_url)
    SessionLocal.configure(bind=engine)
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def session_ctx(database_url):
    # Code to acquire resource, e.g.:
    engine = get_engine(database_url)
    SessionLocal.configure(bind=engine)
    with SessionLocal() as s:
        yield s
        s.commit()
        s.close()
