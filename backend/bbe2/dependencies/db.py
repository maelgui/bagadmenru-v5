from bbe2.database import SessionLocal


def make_get_db(session):
    def inner():
        db = session()
        try:
            yield db
        finally:
            db.close()

    return inner

get_db = make_get_db(SessionLocal)
