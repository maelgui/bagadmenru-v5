import requests
from sqlalchemy import create_engine

from bbe2.config import get_settings
from bbe2.database import Base, SessionLocal
from bbe2.models import Group, Profile

settings = get_settings()


def create_admin(session, email, firstname, lastname):
    user_endpoint = f"{settings.user_api_endpoint}/users"
    res = requests.post(user_endpoint, json={"email": email}, timeout=10)
    res.raise_for_status()

    profile_db = Profile(
        id=res.json()["id"],
        email=email,
        first_name=firstname,
        last_name=lastname,
        groups=session.query(Group).filter(Group.id == 1).all(),
    )

    session.add(profile_db)
    session.commit()
    session.refresh(profile_db)


if __name__ == "__main__":
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(bind=engine)
    SessionLocal.configure(bind=engine)
    create_admin(
        SessionLocal(),
        "mael@guillossou.bzh",
        "Mael",
        "Guillossou",
    )
