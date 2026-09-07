"""Group resolution helpers shared across endpoints."""

from typing import Iterable

from sqlalchemy import or_
from sqlalchemy.orm import Session as DbSession

from bbe2.models.user import GroupDB


def resolve_groups_with_defaults(
    session: DbSession, group_ids: Iterable[int]
) -> list[GroupDB]:
    """Return the requested groups plus every ``is_default`` group.

    A member always belongs to the default group(s); on top of that they get
    the explicitly requested ones (e.g. their instrument). Fetched in a single
    query and naturally de-duplicated. Shared by profile creation/update and the
    self-service invitation signup so the "requested + defaults" rule lives in
    one place.
    """
    ids = list(group_ids)
    return list(
        session.query(GroupDB)
        .filter(
            or_(
                GroupDB.id.in_(ids),
                GroupDB.is_default,
            )
        )
        .all()
    )
