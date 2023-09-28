from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Security, status

from bbe2 import models, schemas
from bbe2.crud.crud_profile import CRUDProfile
from bbe2.dependencies.auth import get_current_user
from bbe2.utils.scopes import ProfilesScopes

router = APIRouter(prefix="/profiles")


@router.get("/me", response_model=schemas.Profile)
async def get_my_profile(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[]),
):
    print(token)
    db_profile = profile_crud.find_one_by(models.Profile.id == token["sub"])
    if not db_profile:
        db_profile = profile_crud.create(
            id=token["sub"],
            first_name=token["given_name"],
            last_name=token["family_name"],
        )
    return db_profile


@router.put("/me", response_model=schemas.Profile)
async def update_my_profile(
    profile: schemas.ProfileUpdate,
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == token["sub"])
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@router.get("/{profile_id}", response_model=schemas.Profile)
async def get_profile(
    profile_id: str,
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[ProfilesScopes.UPDATE]),
):
    db_profile = profile_crud.find_one_by(models.Event.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return db_profile


@router.get("/", response_model=list[schemas.Profile])
async def list_profiles(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user),
):
    return profile_crud.find_all()
