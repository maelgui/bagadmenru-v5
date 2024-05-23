import logging
import uuid
from datetime import datetime
from typing import Any

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Security, status
from keycloak import KeycloakAdmin
from sqlalchemy import cast, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import count, sum
from sqlalchemy.types import Integer

from bbe2 import models, schemas
from bbe2.config import settings
from bbe2.crud import CRUDInstrument, CRUDProfile
from bbe2.dependencies.auth import get_current_user
from bbe2.dependencies.db import get_db
from bbe2.schemas.utils import GlobalStats, MyStats
from bbe2.utils.s3 import s3
from bbe2.utils.scopes import ProfilesScopes

profiles_router = APIRouter(prefix="/profiles")


@profiles_router.get("/me")
async def get_my_profile(
    profile_crud: CRUDProfile = Depends(),
    token: dict[str, Any] = Security(get_current_user, scopes=[]),
) -> schemas.Profile:
    db_profile = profile_crud.find_one_by(models.Profile.id == token["sub"])

    admin = KeycloakAdmin(
        server_url=settings.keycloak_url,
        client_id=settings.keycloak_client_id,
        client_secret_key=settings.keycloak_secret_key,
        realm_name="bagadmenru",
    )

    if not db_profile:
        db_profile = profile_crud.create(
            id=token["sub"],
            first_name=token["given_name"],
            last_name=token["family_name"],
            email=token["email"],
        )
        admin.update_user(db_profile.id, {"bbe2ProfileCreated": "yes"})

    # Retrieve groups
    kc_groups: list[dict[str, str]] = admin.get_user_groups(db_profile.id)
    profile = schemas.Profile.model_validate(db_profile)
    profile.groups = [schemas.Group.model_validate(g) for g in kc_groups]

    return profile


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
    session: Session = Depends(get_db),
    token: dict[str, Any] = Security(get_current_user),
):
    q = select(models.Profile).order_by(models.Profile.instrument_id)
    print(q)
    res = session.scalars(q).all()
    return res


instruments_router = APIRouter(prefix="/instruments")


@instruments_router.get("/", response_model=list[schemas.Instrument])
async def list_instruments(
    instru_crud: CRUDInstrument = Depends(),
    token: dict[str, Any] = Security(get_current_user),
):
    return instru_crud.find_all()


stats_router = APIRouter(prefix="/stats")


@stats_router.get("/me")
async def get_my_stats(
    token: dict[str, Any] = Security(get_current_user),
    session: Session = Depends(get_db),
) -> MyStats:
    date_now = datetime.now()
    date_debut_saison = datetime(
        year=date_now.year if date_now.month >= 9 else date_now.year - 1,
        month=9,
        day=1,
    )

    q = select(
        count(models.Response.value).label("n_responses"),
        sum(cast(models.Response.value, Integer)).label("n_positive_responses"),
        func.avg(models.Response.date - models.Event.created_at).label(
            "avg_response_time"
        ),
    ).join_from(models.Event, models.Response)
    q = q.where(models.Event.date >= date_debut_saison)
    q = q.where(models.Response.user_id == token["sub"])
    q = q.where(models.Event.is_in_doodle == True)
    res1 = session.execute(q).one()._mapping

    q = select(
        (count(models.Event.id) - count(models.Response.value)).label(
            "responses_needed"
        ),
    ).join_from(models.Event, models.Response, isouter=True)
    q = q.where(models.Event.date >= date_now)
    q = q.where(
        or_(models.Response.user_id == None, models.Response.user_id == token["sub"])
    )
    q = q.where(models.Event.is_in_doodle == True)
    res4 = session.execute(q).one()._mapping

    return MyStats(**dict(**res1, **res4))


@stats_router.get("/")
async def get_global_stats(
    token: dict[str, Any] = Security(get_current_user),
    session: Session = Depends(get_db),
) -> GlobalStats:
    date_now = datetime.now()
    date_debut_saison = datetime(
        year=date_now.year if date_now.month >= 9 else date_now.year - 1,
        month=9,
        day=1,
    )

    q = select(
        count(models.Response.value).label("n_responses"),
        func.avg(models.Response.date - models.Event.created_at).label(
            "avg_response_time"
        ),
    ).join_from(models.Event, models.Response)
    q = q.where(models.Event.date >= date_debut_saison)
    q = q.where(models.Event.is_in_doodle == True)
    res2 = session.execute(q).one()._mapping

    q = select(
        count(models.Event.id).label("n_events"),
    ).select_from(models.Event)
    q = q.where(models.Event.date >= date_debut_saison)
    q = q.where(models.Event.is_in_doodle == True)
    res3 = session.execute(q).one()._mapping

    return GlobalStats(**dict(**res2, **res3))


groups_router = APIRouter(prefix="/groups")


@groups_router.get("/", response_model=list[schemas.Group])
async def list_groups(
    token: dict[str, Any] = Security(get_current_user),
):

    admin = KeycloakAdmin(
        server_url=settings.keycloak_url,
        client_id=settings.keycloak_client_id,
        client_secret_key=settings.keycloak_secret_key,
        realm_name="bagadmenru",
    )
    return admin.get_groups()


invitations_router = APIRouter(prefix="/invitations")


@invitations_router.get("/", response_model=list[schemas.Profile])
async def list_invitations(
    token: dict[str, Any] = Security(get_current_user),
):

    admin = KeycloakAdmin(
        server_url=settings.keycloak_url,
        client_id=settings.keycloak_client_id,
        client_secret_key=settings.keycloak_secret_key,
        realm_name="bagadmenru",
    )
    users: list[dict[str, str]] = admin.get_users({"q": "bbe2ProfileCreated:no"})
    return [
        schemas.Profile(
            id=user["id"],
            email=user["email"],
            first_name=user.get("firstName", ""),
            last_name=user.get("lastName", ""),
            picture_key=None,
            instrument_id=None,
        )
        for user in users
    ]


@invitations_router.post("/", status_code=201)
async def create_invitations(
    profile: schemas.Invitation,
    token: dict[str, Any] = Security(get_current_user),
):

    admin = KeycloakAdmin(
        server_url=settings.keycloak_url,
        client_id=settings.keycloak_client_id,
        client_secret_key=settings.keycloak_secret_key,
        realm_name="bagadmenru",
    )
    admin.create_user(
        {
            "email": profile.email,
            "firstName": profile.first_name,
            "lastName": profile.last_name,
            "enabled": "true",
            "attributes": {
                "bbe2ProfileCreated": "no",
            },
        }
    )


router = APIRouter()
router.include_router(profiles_router)
router.include_router(instruments_router)
router.include_router(stats_router)
router.include_router(groups_router)
router.include_router(invitations_router)
