from sqlalchemy import create_engine

from bbe2.config import get_settings
from bbe2.database import Base, SessionLocal
from bbe2.models.profile import Group, Permission
from bbe2.utils.scopes import (
    AlbumScopes,
    EventScopes,
    FileScopes,
    GroupScopes,
    ProfilesScopes,
    UtilsScopes,
)


def init_fixtures(session):
    permissions_group = [
        AlbumScopes,
        EventScopes,
        FileScopes,
        ProfilesScopes,
        GroupScopes,
        UtilsScopes,
    ]
    permission_objs = []
    for g in permissions_group:
        for permission in g:
            p = Permission(
                id=str(permission),
                tag=g.__name__,
                name=permission.name,
                description=permission.value,
            )
            permission_objs.append(p)
            # session.merge(p)
    admin_group = Group(id=1, name="Admins", permissions=permission_objs)
    session.merge(admin_group)
    session.commit()


def init_db():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(bind=engine)
    SessionLocal.configure(bind=engine)
    init_fixtures(SessionLocal())
