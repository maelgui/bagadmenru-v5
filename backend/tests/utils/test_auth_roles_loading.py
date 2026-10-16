from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine
from bbe2.models.base import Base
from bbe2.utils.auth import build_jwt_payload

DATABASE_URL = "sqlite:///tests_auth_roles.sqlite?check_same_thread=false"


def _settings():
    from tests.conftest import get_fake_settings

    return get_fake_settings()


def _seed_user_with_groups(session, n_groups: int) -> models.UserDB:
    instrument = models.GroupDB(id=1, name="Piccolo", color="#fff")
    session.add(instrument)
    role = models.RoleDB(id="member", description="Member")
    session.add(role)

    groups = []
    for i in range(2, 2 + n_groups):
        group = models.GroupDB(id=i, name=f"group-{i}", color="#fff")
        group.roles = [role]
        session.add(group)
        groups.append(group)

    user = models.UserDB(
        id="u-multi-group",
        email="multi@example.com",
        first_name="Multi",
        last_name="Group",
        instrument_id=1,
    )
    user.groups = groups
    session.add(user)
    session.commit()
    return user


def test_build_jwt_payload_loads_roles_without_n_plus_one():
    """Loading a user's group roles must not scale with the number of groups.

    Regression for Sentry BBE2-59: build_jwt_payload iterated g.roles per group,
    firing one SELECT on roles per group (N+1) on /events/export/ics/me. With
    selectin loading, all roles load in a single batched query.
    """
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with session_local() as session:
        _seed_user_with_groups(session, n_groups=6)

    role_selects: list[str] = []

    def _record(_conn, _cursor, statement, *_args):
        if "FROM roles" in statement or "roles.id" in statement:
            role_selects.append(statement)

    with session_local() as session:
        event.listen(engine, "before_cursor_execute", _record)
        try:
            user = session.get(models.UserDB, "u-multi-group")
            payload = build_jwt_payload(user, _settings())
        finally:
            event.remove(engine, "before_cursor_execute", _record)

    assert payload.roles == ["member"] * 6
    # One batched SELECT for all groups' roles, not one per group.
    assert len(role_selects) == 1, (
        f"expected a single batched roles query, got {len(role_selects)}:\n"
        + "\n".join(role_selects)
    )
