import logging
import uuid
from typing import Any

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Security, status

from bbe2 import models, schemas
from bbe2.crud import CRUDInstrument, CRUDProfile
from bbe2.dependencies.auth import get_current_user
from bbe2.utils.s3 import s3
from bbe2.utils.scopes import ProfilesScopes

profiles_router = APIRouter(prefix="/profiles")


@profiles_router.get("/me", response_model=schemas.Profile)
async def get_my_profile(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == token["sub"])

    if not db_profile:
        db_profile = profile_crud.create(
            id=token["sub"],
            first_name=token["given_name"],
            last_name=token["family_name"],
            email=token["email"],
        )
    return db_profile


@profiles_router.put("/me", response_model=schemas.Profile)
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
    if profile.picture_key and profile.picture_key != db_profile.picture_key:
        if db_profile.picture_key:
            try:
                s3.delete_object(db_profile.picture_key)
            except ClientError as exc:
                logging.error(
                    "Unable to delete profile picture %s: %s",
                    db_profile.picture_key,
                    exc,
                )
        s3.set_tags(
            profile.picture_key,
            {"user_id": token["sub"], "temp": "false"},
        )
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.post("/me/avatar")
async def upload_avatar(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[]),
) -> schemas.GetUploadUrlResponse:
    db_profile = profile_crud.find_one_by(models.Profile.id == token["sub"])
    object_name = f"pp/{uuid.uuid4()}"
    return schemas.GetUploadUrlResponse(
        url=s3.generate_put_presigned_url(
            object_name,
            {"user_id": token["sub"], "temp": "true"},
        ),
        key=object_name,
    )


@profiles_router.get("/{profile_id}", response_model=schemas.Profile)
async def get_profile(
    profile_id: str,
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(
        get_current_user, scopes=[ProfilesScopes.VIEW.value]
    ),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return db_profile


@profiles_router.get("/", response_model=list[schemas.Profile])
async def list_profiles(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user),
):
    return profile_crud.find_all()


instruments_router = APIRouter(prefix="/instruments")


@instruments_router.get("/", response_model=list[schemas.Instrument])
async def list_instruments(
    instru_crud: CRUDInstrument = Depends(),
    token: dict[str, Any] = Security(get_current_user),
):
    return instru_crud.find_all()


router = APIRouter()
router.include_router(profiles_router)
router.include_router(instruments_router)
