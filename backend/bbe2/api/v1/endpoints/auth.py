import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from bbe2 import models, schemas
from bbe2.crud import CRUDInstrument, CRUDProfile
from bbe2.dependencies.db import get_db
from bbe2.utils.scopes import EventScopes

router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(
    data: schemas.LoginData,
    request: Request,
    profile_crud: CRUDProfile = Depends(),
    session: Session = Depends(get_db),
):
    db_profile = profile_crud.find_one_by(models.Profile.email == data.identifier)
    if not db_profile or not bcrypt.checkpw(
        data.password.encode(), db_profile.password.encode()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    admin_group = session.get_one(models.Group, 1)
    db_profile.groups = [admin_group]
    profile_crud.db_session.commit()
    profile_crud.db_session.refresh(db_profile)

    request.session["identifier"] = db_profile.id
    request.session["email"] = db_profile.email
    request.session["permissions"] = [
        p.id for g in db_profile.groups for p in g.permissions
    ]
    return "OK"
