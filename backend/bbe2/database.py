from contextlib import contextmanager
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from bbe2.config import Settings, get_settings

SessionLocal = sessionmaker(autocommit=False, autoflush=False)


@lru_cache
def get_engine(url: str):
    return create_engine(url)


def get_session(settings: Annotated[Settings, Depends(get_settings)]):
    engine = get_engine(settings.database_url)
    SessionLocal.configure(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.commit()
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


