from datetime import datetime

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from bbe2 import models, schemas
from bbe2.crud import CRUDProfile
from bbe2.dependencies.db import get_db

router = APIRouter(prefix="/auth")


@router.post("/login")
async def login(
    data: schemas.LoginData,
    request: Request,
    profile_crud: CRUDProfile = Depends(),
):
    db_profile = profile_crud.find_one_by(models.Profile.email == data.identifier)
    if not db_profile or not bcrypt.checkpw(
        data.password.encode(), db_profile.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    request.session["identifier"] = db_profile.id
    request.session["email"] = db_profile.email
    request.session["permissions"] = [
        p.id for g in db_profile.groups for p in g.permissions
    ]
    current_user = schemas.SessionData(
        identifier=db_profile.id,
        email=db_profile.email,
        permissions=[p.id for g in db_profile.groups for p in g.permissions],
    )
    request.session["current_user"] = current_user.model_dump()

    return "OK"


@router.post("/logout")
async def logout(
    request: Request,
):
    request.session["identifier"] = None
    request.session["email"] = None
    request.session["permissions"] = None
    return "OK"
