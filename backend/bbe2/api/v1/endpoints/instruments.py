"""Public instrument list.

Instrument groups (``GroupDB.is_instrument``) are reference data used by several
forms: the public self-service signup (``/invite/{token}``) and the admin
profile create/edit form. They carry no sensitive data, so they are exposed as a
public, minimal resource (id/name/color/is_instrument) rather than through the
authenticated ``/groups`` endpoint, which returns the full group graph including
members and roles.
"""

from fastapi import APIRouter
from sqlalchemy import select

from bbe2 import models
from bbe2.dependencies import SessionDep
from bbe2.schemas.profile import PublicInstrument

router = APIRouter(prefix="/instruments")


@router.get("", response_model=list[PublicInstrument])
async def list_instruments(session: SessionDep) -> list[models.GroupDB]:
    """Public: the instrument groups a member can be assigned to.

    Returns only the ``PublicInstrument`` fields (id/name/color) and only groups
    flagged ``is_instrument``, ordered by name — safe to expose unauthenticated.
    The response schema is a dedicated, closed shape (not a shared group schema)
    so this public surface cannot be widened by accident.
    """
    return list(
        session.scalars(
            select(models.GroupDB)
            .where(models.GroupDB.is_instrument)
            .order_by(models.GroupDB.name)
        ).all()
    )
