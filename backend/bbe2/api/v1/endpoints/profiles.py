import logging
import uuid
from datetime import datetime
from typing import Annotated

import httpx
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import cast, func, or_, select, update
from sqlalchemy.sql import functions as sql_fn
from sqlalchemy.types import Integer

from bbe2 import models, schemas
from bbe2.crud import CRUDProfile
from bbe2.dependencies import S3Dep, SessionDep, SettingsDep, TemplateDep, get_s3_helper
from bbe2.schemas.profile import MinimalGroup, Profile
from bbe2.schemas.utils import (
    GlobalStats,
    MyStats,
    RankingInfo,
    UserRankingItem,
    UserRankings,
)
from bbe2.utils.auth import (
    Action,
    ActionTokenAuthorization,
    ActionTokenValue,
    Authorization,
    Resource,
    get_current_user2,
)

profiles_router = APIRouter(prefix="/profiles")


@profiles_router.get(
    "/me",
    response_model=schemas.Profile,
    dependencies=[
        Depends(Authorization(Action.VIEW, Resource.ME)),
        Depends(get_s3_helper),
    ],
)
async def get_my_profile(
    profile_crud: Annotated[CRUDProfile, Depends()],
    identifier: Annotated[str, Depends(get_current_user2)],
):
    db_profile = profile_crud.find_one_by(models.UserDB.id == identifier)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    return db_profile


@profiles_router.get(
    "/me/roles",
    response_model=list[str],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def get_my_roles(
    profile_crud: Annotated[CRUDProfile, Depends()],
    identifier: Annotated[str, Depends(get_current_user2)],
):
    db_profile = profile_crud.find_one_by(models.UserDB.id == identifier)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    return [role.id for group in db_profile.groups for role in group.roles]


@profiles_router.put(
    "/me",
    response_model=schemas.Profile,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ME))],
)
async def update_my_profile(
    profile: schemas.MyProfileUpdate,
    profile_crud: Annotated[CRUDProfile, Depends()],
    s3: S3Dep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    db_profile = profile_crud.find_one_by(models.UserDB.id == identifier)
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
            {"user_id": identifier, "temp": "false"},
        )
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.post(
    "/me/avatar",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def upload_avatar(
    s3: S3Dep,
    identifier: Annotated[str, Depends(get_current_user2)],
) -> schemas.GetUploadUrlResponse:
    object_name = f"pp/{uuid.uuid4()}"
    return schemas.GetUploadUrlResponse(
        url=s3.generate_put_presigned_url(
            object_name,
            {"user_id": identifier, "temp": "true"},
        ),
        key=object_name,
    )


@profiles_router.get(
    "/{profile_id}",
    response_model=schemas.Profile,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.PROFILE))],
)
async def get_profile(
    profile_id: str,
    profile_crud: Annotated[CRUDProfile, Depends()],
):
    db_profile = profile_crud.find_one_by(models.UserDB.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return db_profile


@profiles_router.put(
    "/{profile_id}",
    response_model=schemas.Profile,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.PROFILE))],
)
async def update_profile(
    profile_id: str,
    profile: schemas.ProfileUpdate,
    profile_crud: Annotated[CRUDProfile, Depends()],
):
    db_profile = profile_crud.find_one_by(models.UserDB.id == profile_id)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    profile.group_ids.append(profile.instrument_id)
    # Fetch requested groups + always include default groups in a single query
    groups = (
        profile_crud.db_session.query(models.GroupDB)
        .filter(
            or_(
                models.GroupDB.id.in_(profile.group_ids),
                models.GroupDB.is_default,
            )
        )
        .all()
    )
    db_profile.groups = groups
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.get(
    "/",
    response_model=list[schemas.Profile],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.PROFILE))],
)
async def list_profiles(
    session: SessionDep,
):
    q = select(models.UserDB).order_by(
        models.UserDB.instrument_id, models.UserDB.first_name
    )
    res = session.scalars(q).all()
    return res


@profiles_router.post(
    "/",
    response_model=schemas.Profile,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.PROFILE))],
)
async def create_profile(
    profile: schemas.ProfileCreate,
    session: SessionDep,
    settings: SettingsDep,
    templates: TemplateDep,
):

    profile_db = models.UserDB(
        **profile.model_dump(exclude={"group_ids"}),
    )
    profile.group_ids.append(profile.instrument_id)
    # Fetch requested groups + always include default groups in a single query
    groups = (
        session.query(models.GroupDB)
        .filter(
            or_(
                models.GroupDB.id.in_(profile.group_ids),
                models.GroupDB.is_default,
            )
        )
        .all()
    )
    profile_db.groups = groups
    session.add(profile_db)
    session.commit()
    session.refresh(profile_db)

    token_serializer = URLSafeTimedSerializer(settings.token_secret_key)
    template_payload = {
        "user": profile_db,
        "domain": settings.frontend_base_url,
        "token": token_serializer.dumps(
            {
                "user_id": profile_db.id,
                "action": ActionTokenValue.ResetPassword.value,
            }
        ),
        "unsubscribe_token": token_serializer.dumps(
            {
                "user_id": profile_db.id,
                "action": ActionTokenValue.Unsubscribe.value,
            }
        ),
    }

    html_template = templates.get_template("email_welcome.html")
    text_template = templates.get_template("email_welcome.txt")
    email = {
        "subject": "[bagadmenru] Bienvenue !",
        "to": profile_db.email,
        "body_text": text_template.render(**template_payload),
        "body_html": html_template.render(**template_payload),
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{settings.email_api_endpoint}/batch_send_emails",
            timeout=10,
            json=[email],
        )
        r.raise_for_status()

    return profile_db


@profiles_router.post(
    "/{profile_id}/unsubscribe",
)
def unsubscribe(
    profile_id: str,
    session: SessionDep,
    token_payload: Annotated[
        dict, Depends(ActionTokenAuthorization(ActionTokenValue.Unsubscribe))
    ],
):
    if token_payload["user_id"] != profile_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    profile_db = (
        session.query(models.UserDB)
        .filter(models.UserDB.id == token_payload["user_id"])
        .first()
    )
    if not profile_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    stmt = (
        update(models.UserDB)
        .values(receives_emails=False)
        .where(models.UserDB.id == token_payload["user_id"])
    )
    session.execute(stmt)

    return "OK"


stats_router = APIRouter(prefix="/stats")


@stats_router.get(
    "/me",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def get_my_stats(
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
) -> MyStats:
    date_now = datetime.now()
    date_debut_saison = datetime(
        year=date_now.year if date_now.month >= 9 else date_now.year - 1,
        month=9,
        day=1,
    )

    q = select(
        func.coalesce(sql_fn.sum(cast(models.ResponseDB.value, Integer)), 0).label(
            "n_positive_responses"
        ),
        func.avg(models.ResponseDB.date - models.EventDB.created_at).label(
            "avg_response_time"
        ),
        sql_fn.count(models.ResponseDB.value).label("n_responses"),
    ).join_from(models.EventDB, models.ResponseDB)
    q = q.where(models.EventDB.date >= date_debut_saison)
    q = q.where(models.ResponseDB.user_id == identifier)
    q = q.where(models.EventDB.is_in_doodle == True)
    n_positive_responses, avg_response_time, n_responses = session.execute(q).one()

    q = select(
        sql_fn.count(models.ResponseDB.value).label("n_upcomming_responses"),
    ).join_from(models.EventDB, models.ResponseDB)
    q = q.where(models.EventDB.date >= date_now)
    q = q.where(models.ResponseDB.user_id == identifier)
    q = q.where(models.EventDB.is_in_doodle == True)
    n_upcomming_responses = session.scalars(q).one()

    return MyStats(
        n_positive_responses=n_positive_responses,
        avg_response_time=avg_response_time,
        n_responses=n_responses,
        n_upcomming_responses=n_upcomming_responses,
    )


@stats_router.get(
    "/",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def get_global_stats(
    session: SessionDep,
) -> GlobalStats:
    date_now = datetime.now()
    date_debut_saison = datetime(
        year=date_now.year if date_now.month >= 9 else date_now.year - 1,
        month=9,
        day=1,
    )

    q = select(
        sql_fn.count(models.ResponseDB.value).label("n_responses"),
        func.avg(models.ResponseDB.date - models.EventDB.created_at).label(
            "avg_response_time"
        ),
    ).join_from(models.EventDB, models.ResponseDB)
    q = q.where(models.EventDB.date >= date_debut_saison)
    q = q.where(models.EventDB.is_in_doodle == True)
    (n_responses, avg_response_time) = session.execute(q).one()

    q = select(
        sql_fn.count(models.EventDB.id).label("n_events"),
    ).select_from(models.EventDB)
    q = q.where(models.EventDB.date >= date_debut_saison)
    q = q.where(models.EventDB.is_in_doodle == True)
    res3 = session.scalar(q)

    q = select(
        sql_fn.count(models.EventDB.id).label("n_upcoming_event"),
    ).select_from(models.EventDB)
    q = q.where(models.EventDB.date >= date_now)
    q = q.where(models.EventDB.is_in_doodle == True)
    res4 = session.scalar(q)

    return GlobalStats(
        **dict(
            n_responses=n_responses,
            avg_response_time=avg_response_time,
            n_events=res3,
            n_upcoming_event=res4,
        )
    )


@stats_router.get(
    "/rankings",
    response_model=UserRankings,
    dependencies=[
        Depends(Authorization(Action.VIEW, Resource.EVENT)),
        Depends(Authorization(Action.VIEW, Resource.PROFILE)),
        Depends(get_s3_helper),
    ],
)
async def get_user_rankings(
    session: SessionDep,
) -> UserRankings:
    """
    Get rankings of users based on their response metrics.
    Returns rankings for n_responses, n_positive_responses, and avg_response_time.
    Only includes users with more than 5 positive responses since 2024-09-01.
    """
    # Create a subquery to get the base metrics
    subq = (
        select(
            models.UserDB.id.label("user_id"),
            sql_fn.count().label("n_responses"),
            sql_fn.sum(cast(models.ResponseDB.value, Integer)).label(
                "n_positive_responses"
            ),
            func.avg(models.ResponseDB.date - models.EventDB.created_at).label(
                "avg_response_time"
            ),
        )
        .join(models.ResponseDB, models.UserDB.id == models.ResponseDB.user_id)
        .join(models.EventDB, models.ResponseDB.event_id == models.EventDB.id)
        .where(models.EventDB.date > datetime(2024, 9, 1))
        .group_by(models.UserDB.id)
        .having(func.sum(cast(models.ResponseDB.value == True, Integer)) >= 3)
        .subquery()
    )

    # Query with window functions to calculate ranks
    q = select(
        models.UserDB,
        subq.c.n_responses,
        subq.c.n_positive_responses,
        subq.c.avg_response_time,
        sql_fn.dense_rank()
        .over(order_by=subq.c.n_responses.desc())
        .label("n_responses_rank"),
        sql_fn.dense_rank()
        .over(order_by=subq.c.n_positive_responses.desc())
        .label("n_positive_responses_rank"),
        sql_fn.dense_rank()
        .over(order_by=subq.c.avg_response_time.asc())
        .label("avg_response_time_rank"),
    ).join(subq, models.UserDB.id == subq.c.user_id)

    results = session.execute(q).all()

    # Convert results to list of dictionaries
    user_data = []
    for row in results:
        # Handle NULL avg_response_time_rank (when avg_response_time is NULL)
        avg_response_time_rank = (
            row.avg_response_time_rank if row.avg_response_time is not None else None
        )

        user_data.append(
            {
                "user_db": row.UserDB,
                "n_responses": row.n_responses,
                "n_positive_responses": row.n_positive_responses,
                "avg_response_time": row.avg_response_time,
                "n_responses_rank": row.n_responses_rank,
                "n_positive_responses_rank": row.n_positive_responses_rank,
                "avg_response_time_rank": avg_response_time_rank,
            }
        )

    # Create UserRankingItem objects with nested structure
    ranking_items = []
    for user in user_data:
        ranking_info = RankingInfo(
            n_responses=user["n_responses"],
            n_positive_responses=user["n_positive_responses"],
            avg_response_time=user["avg_response_time"],
            n_responses_rank=user["n_responses_rank"],
            n_positive_responses_rank=user["n_positive_responses_rank"],
            avg_response_time_rank=user["avg_response_time_rank"],
        )

        # Convert UserDB to Profile
        user_db = user["user_db"]

        # Create a Profile object with the correct field types
        profile = Profile(
            id=user_db.id,
            first_name=user_db.first_name,
            last_name=user_db.last_name,
            picture_key=user_db.picture_key,
            groups=[
                MinimalGroup(id=g.id, name=g.name, color=g.color)
                for g in user_db.groups
            ],
            instrument=(
                MinimalGroup(
                    id=user_db.instrument.id,
                    name=user_db.instrument.name,
                    color=user_db.instrument.color,
                )
                if user_db.instrument
                else None
            ),
        )

        # Create the nested item
        ranking_item = UserRankingItem(
            user=profile, ranks=ranking_info  # Use the Profile object
        )

        ranking_items.append(ranking_item)

    return UserRankings(rankings=ranking_items)


groups_router = APIRouter(prefix="/groups")


@groups_router.get(
    "/",
    response_model=list[schemas.Group],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.GROUP))],
)
async def list_groups(
    session: SessionDep,
):
    q = select(models.GroupDB).order_by(models.GroupDB.name)
    res = session.scalars(q).all()

    return res


@groups_router.get(
    "/{group_id}",
    response_model=schemas.Group,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.GROUP))],
)
async def get_group(
    group_id: int,
    session: SessionDep,
):
    q = session.get(models.GroupDB, group_id)

    return q


@groups_router.post(
    "/",
    response_model=schemas.Group,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.GROUP))],
)
async def create_group(
    group: schemas.GroupCreate,
    session: SessionDep,
):
    group_db = models.GroupDB(name=group.name, color=group.color)
    roles = (
        session.query(models.RoleDB).filter(models.RoleDB.id.in_(group.role_ids)).all()
    )
    group_db.roles = roles
    session.add(group_db)
    session.commit()
    session.refresh(group_db)

    return group_db


@groups_router.put(
    "/{group_id}",
    response_model=schemas.Group,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.GROUP))],
)
async def update_group(
    group_id: int,
    group: schemas.GroupUpdate,
    session: SessionDep,
):
    group_db = session.get(models.GroupDB, group_id)
    if not group_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    roles = (
        session.query(models.RoleDB).filter(models.RoleDB.id.in_(group.role_ids)).all()
    )
    group_db.roles = roles
    group_db.color = group.color
    group_db.name = group.name
    group_db.mailing_list = group.mailing_list
    session.commit()
    return group_db


permissions_router = APIRouter(prefix="/roles")


@permissions_router.get(
    "/",
    response_model=list[schemas.Role],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.GROUP))],
)
async def list_roles(
    session: SessionDep,
):
    q = select(models.RoleDB).order_by(models.RoleDB.id)
    res = session.scalars(q).all()

    return res


router = APIRouter()
router.include_router(profiles_router)
router.include_router(stats_router)
router.include_router(groups_router)
router.include_router(permissions_router)
