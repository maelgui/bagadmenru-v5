from typing import Iterable

from sqlalchemy import delete, insert

from bbe2.database import SessionLocal
from bbe2.models.profile import Group, Permission
from bbe2.utils.scopes import (
    AlbumScopes,
    EventScopes,
    FileScopes,
    PermissionBase,
    ProfilesScopes,
)


def init_fixtures():
    with SessionLocal() as session:
        permissions_group = [
            AlbumScopes,
            EventScopes,
            FileScopes,
            ProfilesScopes,
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
                session.merge(p)
        admin_group = Group(id=1, name="Admins", permissions=permission_objs)
        session.merge(admin_group)
        session.commit()
