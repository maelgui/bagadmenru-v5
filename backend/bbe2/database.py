from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from bbe2.config import settings

SQLALCHEMY_DATABASE_URL = settings.database_url
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@postgresserver/db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
