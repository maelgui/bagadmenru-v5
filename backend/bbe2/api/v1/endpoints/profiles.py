import logging
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any

import httpx
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, Header, HTTPException, Security, status
from sqlalchemy import cast, func, select
from sqlalchemy.sql.functions import count, sum
from sqlalchemy.types import Integer

from bbe2 import models, schemas
from bbe2.crud import CRUDProfile
from bbe2.dependencies import S3Dep, SessionDep, SettingsDep
from bbe2.schemas.utils import GlobalStats, MyStats
from bbe2.utils.auth import get_current_user
from bbe2.utils.scopes import GroupScopes, ProfilesScopes

profiles_router = APIRouter(prefix="/profiles")


@profiles_router.get("/me", response_model=schemas.Profile)
async def get_my_profile(
    settings: SettingsDep,
    profile_crud: CRUDProfile = Depends(),
    identifier: str = Security(get_current_user, scopes=[]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == identifier)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    if (
        not db_profile.last_synchronization
        or db_profile.last_synchronization < datetime.now() - timedelta(minutes=2)
    ):
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{settings.user_api_endpoint}/users/{identifier}",
                timeout=10,
            )
            r.raise_for_status()
        idp_profile = r.json()
        db_profile.email = idp_profile["email"]
        db_profile.last_synchronization = datetime.now()
        profile_crud.db_session.commit()
        logging.info("Synchronizing profile %s: %s", identifier, r.json())

    return db_profile


@profiles_router.get("/me/permissions", response_model=list[str])
async def get_my_permissions(
    profile_crud: CRUDProfile = Depends(),
    identifier: str = Security(get_current_user, scopes=[]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == identifier)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    return [p.id for g in db_profile.groups for p in g.permissions]


@profiles_router.put("/me", response_model=schemas.Profile)
async def update_my_profile(
    profile: schemas.MyProfileUpdate,
    profile_crud: Annotated[CRUDProfile, Depends()],
    s3: S3Dep,
    user_identifier: str = Security(get_current_user, scopes=[]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == user_identifier)
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
            {"user_id": user_identifier, "temp": "false"},
        )
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.post("/me/avatar")
async def upload_avatar(
    profile_crud: Annotated[CRUDProfile, Depends()],
    s3: S3Dep,
    user_identifier: str = Security(get_current_user, scopes=[]),
) -> schemas.GetUploadUrlResponse:
    db_profile = profile_crud.find_one_by(models.Profile.id == user_identifier)
    object_name = f"pp/{uuid.uuid4()}"
    return schemas.GetUploadUrlResponse(
        url=s3.generate_put_presigned_url(
            object_name,
            {"user_id": user_identifier, "temp": "true"},
        ),
        key=object_name,
    )


@profiles_router.get("/{profile_id}", response_model=schemas.Profile)
async def get_profile(
    profile_id: str,
    profile_crud: Annotated[CRUDProfile, Depends()],
    token: str = Security(get_current_user, scopes=[str(ProfilesScopes.VIEW)]),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return db_profile


@profiles_router.put("/{profile_id}", response_model=schemas.Profile)
async def update_profile(
    profile_id: str,
    profile: schemas.ProfileUpdate,
    profile_crud: Annotated[CRUDProfile, Depends()],
    user_identifier: str = Security(
        get_current_user, scopes=[str(ProfilesScopes.UPDATE)]
    ),
):
    db_profile = profile_crud.find_one_by(models.Profile.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    groups = (
        profile_crud.db_session.query(models.Group)
        .filter(models.Group.id.in_(profile.group_ids))
        .all()
    )
    db_profile.groups = groups
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.get("/", response_model=list[schemas.Profile])
async def list_profiles(
    session: SessionDep,
    token: str = Security(get_current_user, scopes=[str(ProfilesScopes.VIEW)]),
):
    q = select(models.Profile).order_by(models.Profile.instrument_id)
    print(q)
    res = session.scalars(q).all()
    return res


@profiles_router.post("/", response_model=schemas.Profile)
async def create_profile(
    profile: schemas.ProfileCreate,
    session: SessionDep,
    settings: SettingsDep,
    token: str = Security(get_current_user, scopes=[str(ProfilesScopes.CREATE)]),
):
    # Create user in auth-provider
    user_endpoint = f"{settings.user_api_endpoint}/users"
    res = httpx.post(user_endpoint, json={"email": profile.email}, timeout=10)
    res.raise_for_status()

    profile_db = models.Profile(
        id=res.json()["id"],
        **profile.dict(exclude={"group_ids"}),
    )
    groups = (
        session.query(models.Group).filter(models.Group.id.in_(profile.group_ids)).all()
    )
    profile_db.groups = groups
    session.add(profile_db)
    session.commit()
    session.refresh(profile_db)
    return profile_db


stats_router = APIRouter(prefix="/stats")


@stats_router.get("/me")
async def get_my_stats(
    session: SessionDep,
    token: dict[str, Any] = Security(get_current_user),
) -> MyStats:
    date_now = datetime.now()
    date_debut_saison = datetime(
        year=date_now.year if date_now.month >= 9 else date_now.year - 1,
        month=9,
        day=1,
    )

    q = select(
        func.coalesce(sum(cast(models.Response.value, Integer)), 0).label(
            "n_positive_responses"
        ),
        func.avg(models.Response.date - models.Event.created_at).label(
            "avg_response_time"
        ),
        count(models.Response.value).label("n_responses"),
    ).join_from(models.Event, models.Response)
    q = q.where(models.Event.date >= date_debut_saison)
    q = q.where(models.Response.user_id == token)
    q = q.where(models.Event.is_in_doodle == True)
    res1 = session.execute(q).one()._mapping

    q = select(
        count(models.Response.value).label("n_upcomming_responses"),
    ).join_from(models.Event, models.Response)
    q = q.where(models.Event.date >= date_now)
    q = q.where(models.Response.user_id == token)
    q = q.where(models.Event.is_in_doodle == True)
    res2 = session.execute(q).one()._mapping

    return MyStats(**res1, **res2)


@stats_router.get("/")
async def get_global_stats(
    session: SessionDep,
    token: dict[str, Any] = Security(get_current_user),
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

    q = select(
        count(models.Event.id).label("n_upcoming_event"),
    ).select_from(models.Event)
    q = q.where(models.Event.date >= date_now)
    q = q.where(models.Event.is_in_doodle == True)
    res4 = session.execute(q).one()._mapping

    return GlobalStats(**dict(**res2, **res3, **res4))


groups_router = APIRouter(prefix="/groups")


@groups_router.get("/", response_model=list[schemas.Group])
async def list_groups(
    session: SessionDep,
    token: dict[str, Any] = Security(get_current_user, scopes=[str(GroupScopes.VIEW)]),
):
    q = select(models.Group).order_by(models.Group.name)
    res = session.scalars(q).all()

    return res


@groups_router.get("/{group_id}", response_model=schemas.Group)
async def get_group(
    group_id: int,
    session: SessionDep,
    token: str = Security(get_current_user, scopes=[str(GroupScopes.VIEW)]),
):
    q = session.get(models.Group, group_id)

    return q


@groups_router.post("/", response_model=schemas.Group)
async def create_group(
    group: schemas.GroupCreate,
    session: SessionDep,
    token: str = Security(get_current_user, scopes=[str(GroupScopes.CREATE)]),
):
    group_db = models.Group(name=group.name, color=group.color)
    permissions = (
        session.query(models.Permission)
        .filter(models.Permission.id.in_(group.permission_ids))
        .all()
    )
    group_db.permissions = permissions
    session.add(group_db)
    session.commit()
    session.refresh(group_db)

    return group_db


@groups_router.put("/{group_id}", response_model=schemas.Group)
async def update_group(
    group_id: int,
    group: schemas.GroupUpdate,
    session: SessionDep,
    token: dict[str, Any] = Security(
        get_current_user, scopes=[str(GroupScopes.UPDATE)]
    ),
):
    group_db = session.get(models.Group, group_id)
    if not group_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    permissions = (
        session.query(models.Permission)
        .filter(models.Permission.id.in_(group.permission_ids))
        .all()
    )
    group_db.permissions = permissions
    group_db.color = group.color
    group_db.name = group.name
    session.commit()
    return group_db


permissions_router = APIRouter(prefix="/permissions")


@permissions_router.get("/", response_model=list[schemas.Permission])
async def list_permissions(
    session: SessionDep,
    token: dict[str, Any] = Security(get_current_user),
):
    q = select(models.Permission).order_by(models.Permission.tag)
    res = session.scalars(q).all()

    return res


router = APIRouter()
router.include_router(profiles_router)
router.include_router(stats_router)
router.include_router(groups_router)
router.include_router(permissions_router)
