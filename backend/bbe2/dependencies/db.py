"""Databse fastapi dependencies."""

from bbe2.database import SessionLocal


def make_get_db(session):
    """Generate dependency function from a sqlalchemy session."""

    def inner():
        """Yield sqlalchemy session."""
        db = session()
        try:
            yield db
        finally:
            db.close()

    return inner


get_db = make_get_db(SessionLocal)
