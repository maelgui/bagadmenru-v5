import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Annotated

from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Float, case, cast, extract, func, select, tuple_, update
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import functions as sql_fn
from sqlalchemy.types import Integer

from bbe2 import models, schemas
from bbe2.crud import CRUDProfile
from bbe2.dependencies import S3Dep, SenderDep, SessionDep, SettingsDep, get_s3_helper
from bbe2.models.action_token import ActionTokenValue
from bbe2.schemas.helloasso import MembershipInfo
from bbe2.schemas.profile import Profile
from bbe2.schemas.utils import (
    GlobalStats,
    MyStats,
    RankingInfo,
    SeasonRanking,
    UserRankingItem,
    UserRankings,
)
from bbe2.services import membership as membership_service
from bbe2.services.otp import OTP_MAX_ATTEMPTS, generate_otp, hash_otp
from bbe2.utils.action_token import create_action_token
from bbe2.utils.api_key import create_api_key, revoke_api_key
from bbe2.utils.auth import (
    Action,
    ActionTokenAuthorization,
    Authorization,
    Resource,
    get_current_user2,
)
from bbe2.utils.groups import resolve_groups_with_defaults
from bbe2.utils.permissions import get_permissions_for_roles, is_allowed
from bbe2.utils.templates import EmailData

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

    # Populated on the caller's own profile only (see the schema comment):
    # tells the client whether this is a passkey-only account, for the
    # post-recovery choice and the account-security settings.
    profile = schemas.Profile.model_validate(db_profile)
    profile.has_password = db_profile.password is not None
    return profile


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


@profiles_router.get(
    "/me/permissions",
    response_model=list[str],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def get_my_permissions(
    profile_crud: Annotated[CRUDProfile, Depends()],
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Returns all 'action:resource' permission strings for the current user."""
    db_profile = profile_crud.find_one_by(models.UserDB.id == identifier)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )

    roles = [role.id for group in db_profile.groups for role in group.roles]
    return get_permissions_for_roles(roles)


@profiles_router.get(
    "/me/membership",
    response_model=MembershipInfo,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def get_my_membership(
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Return the current user's membership status and history."""
    return membership_service.get_membership_info_for_user(session, identifier)


@profiles_router.get(
    "/me/api-keys",
    response_model=list[schemas.ApiKey],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def list_my_api_keys(
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """List the current member's API keys (never exposes the raw secret)."""
    q = (
        select(models.ApiKeyDB)
        .where(
            models.ApiKeyDB.user_id == identifier,
            models.ApiKeyDB.revoked_at.is_(None),
        )
        .order_by(models.ApiKeyDB.created_at.desc())
    )
    return list(session.scalars(q).all())


@profiles_router.post(
    "/me/api-keys",
    response_model=schemas.ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_api_key(
    body: schemas.ApiKeyCreate,
    session: SessionDep,
    payload: Annotated[
        schemas.JwtPayload, Depends(Authorization(Action.VIEW, Resource.ME))
    ],
):
    """Mint a new API key for the current member.

    The raw secret is returned exactly once, in this response; only its hash is
    stored, so it can never be retrieved again. Every requested permission must
    be one the member actually holds -- a key can never widen its owner's rights.
    """
    own_permissions = set(get_permissions_for_roles(payload.roles))
    excess = [p for p in body.authorized_permissions if p not in own_permissions]
    if excess:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Permission(s) not held by the member: {', '.join(excess)}",
        )
    raw_key, row = create_api_key(
        session,
        payload.sub,
        body.label,
        body.authorized_permissions,
        auto_generated=body.auto_generated,
    )
    session.commit()
    session.refresh(row)
    return schemas.ApiKeyCreated.model_validate({**row.__dict__, "key": raw_key})


@profiles_router.delete(
    "/me/api-keys/{key_hash}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
)
async def revoke_my_api_key(
    key_hash: str,
    session: SessionDep,
    identifier: Annotated[str, Depends(get_current_user2)],
):
    """Revoke one of the current member's API keys."""
    if not revoke_api_key(session, identifier, key_hash):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
        )
    session.commit()


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


@profiles_router.get(
    "/{profile_id}/membership",
    response_model=MembershipInfo,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.MEMBERSHIP))],
)
async def get_profile_membership(
    profile_id: str,
    session: SessionDep,
):
    """Return a member's membership status and history (staff/admin only)."""
    member = session.get(models.UserDB, profile_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return membership_service.get_membership_info_for_user(session, profile_id)


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
    groups = resolve_groups_with_defaults(profile_crud.db_session, profile.group_ids)
    db_profile.groups = groups
    db_profile = profile_crud.update(db_profile, profile)
    return db_profile


@profiles_router.delete(
    "/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.DELETE, Resource.PROFILE))],
)
async def delete_profile(
    profile_id: str,
    session: SessionDep,
):
    db_profile = (
        session.query(models.UserDB).filter(models.UserDB.id == profile_id).first()
    )
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    db_profile.is_active = False
    session.commit()


@profiles_router.get(
    "/",
    response_model=list[schemas.Profile],
    dependencies=[Depends(get_s3_helper)],
)
async def list_profiles(
    session: SessionDep,
    payload: Annotated[
        schemas.JwtPayload,
        Depends(Authorization(Action.VIEW, Resource.PROFILE)),
    ],
):
    q = (
        select(models.UserDB)
        .where(models.UserDB.is_active)
        .order_by(models.UserDB.instrument_id, models.UserDB.first_name)
        .options(selectinload(models.UserDB.groups))  # Magic happens here!
    )
    profiles = [schemas.Profile.model_validate(p) for p in session.scalars(q).all()]

    # Enrich with membership status only for callers allowed to view other
    # members' adhesion status. Computed in a single grouped query (no N+1);
    # members without a membership row are left at MembershipStatus.NONE.
    if is_allowed(payload.roles, Action.VIEW, Resource.MEMBERSHIP):
        info_by_user = membership_service.compute_info_by_user(session)
        for profile in profiles:
            info = info_by_user.get(profile.id)
            if info is None:
                profile.membership_status = schemas.MembershipStatus.NONE
            else:
                profile.membership_status = info.status
                profile.membership_active_season = info.active_season

    return profiles


@profiles_router.post(
    "/",
    response_model=schemas.Profile,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.PROFILE))],
)
async def create_profile(
    profile: schemas.ProfileCreate,
    session: SessionDep,
    settings: SettingsDep,
    sender: SenderDep,
):

    profile_db = models.UserDB(
        **profile.model_dump(exclude={"group_ids"}),
    )
    profile.group_ids.append(profile.instrument_id)
    # Fetch requested groups + always include default groups in a single query
    groups = resolve_groups_with_defaults(session, profile.group_ids)
    profile_db.groups = groups
    session.add(profile_db)
    session.commit()
    session.refresh(profile_db)

    # Attach any HelloAsso membership ingested earlier that was waiting for this
    # adherent (matched on the adherent email), mirroring the invitation signup
    # path so a manually-created member also sees their adhesion right away.
    if membership_service.link_orphan_memberships_for_user(session, profile_db):
        session.commit()

    # Welcome links are an onboarding path, not a security-sensitive recovery
    # requested seconds ago: reuse the invitation validity window (3 days)
    # instead of the short recovery default, so a member who opens the welcome
    # email the next day does not land on a dead link. The grant has the same
    # shape as every Recovery grant (grant id + code); the welcome email only
    # carries the link form (grant + code prefilled in the URL) since there is
    # no requesting page waiting for a typed code.
    welcome_code = generate_otp()
    welcome_grant = create_action_token(
        session,
        ActionTokenValue.Recovery,
        {
            "user_id": profile_db.id,
            "code_hash": hash_otp(welcome_code),
            "attempts_left": OTP_MAX_ATTEMPTS,
        },
        expires_in=ActionTokenValue.Invitation.max_age,
    )
    unsubscribe_token = create_action_token(
        session,
        ActionTokenValue.Unsubscribe,
        {"user_id": profile_db.id},
    )
    session.commit()
    await sender.batch_send_emails(
        subject="[bagadmenru] Bienvenue !",
        template_name="email_welcome",
        template_data=[
            EmailData(
                to=profile_db.email,
                template_data={
                    "user": profile_db,
                    "frontend_url": str(settings.frontend_base_url).rstrip("/"),
                    "grant_id": welcome_grant,
                    "code": welcome_code,
                    "unsubscribe_token": unsubscribe_token,
                },
            )
        ],
    )

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

    # "Upcoming" is normalised to midnight today so this matches the PWA badge
    # (see services.events.count_unanswered_events). Using datetime.now() here
    # would drop events scheduled earlier today, making the home-page banner
    # disagree with the app-icon badge.
    today = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = select(
        sql_fn.count(models.ResponseDB.value).label("n_upcomming_responses"),
    ).join_from(models.EventDB, models.ResponseDB)
    q = q.where(models.EventDB.date >= today)
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

    # See get_my_stats: normalise "upcoming" to midnight today so n_upcoming_event
    # matches the PWA badge and the home-page banner (n_upcoming_event -
    # n_upcomming_responses) stays consistent throughout the day.
    today = date_now.replace(hour=0, minute=0, second=0, microsecond=0)
    q = select(
        sql_fn.count(models.EventDB.id).label("n_upcoming_event"),
    ).select_from(models.EventDB)
    q = q.where(models.EventDB.date >= today)
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


# Minimum positive responses (all-time) for a user to appear in the rankings.
MIN_POSITIVE_RESPONSES = 3
# September is the first month of a new season.
SEASON_START_MONTH = 9


def _season_of(date: datetime) -> int:
    """Return the starting year of the season a date falls into.

    A season spans September (year N) to August (year N+1); months before
    September belong to the previous year's season.
    """
    return date.year if date.month >= SEASON_START_MONTH else date.year - 1


def _season_expr(date_col):
    """SQL counterpart of :func:`_season_of` for grouping/filtering."""
    year = cast(extract("year", date_col), Integer)
    month = cast(extract("month", date_col), Integer)
    return case((month >= SEASON_START_MONTH, year), else_=year - 1)


def _load_profiles(session, user_ids: set[str]) -> dict[str, Profile]:
    """Load the given users and map them to public profiles, keyed by id.

    ``Profile`` (and ``MinimalGroup``) declare ``from_attributes=True``, so
    Pydantic reads the ORM row directly; the ``get_s3_helper`` dependency on
    the route wires up ``picture_url`` during serialization.
    """
    if not user_ids:
        return {}
    users = session.scalars(
        select(models.UserDB).where(models.UserDB.id.in_(user_ids))
    ).all()
    return {user.id: Profile.model_validate(user) for user in users}


def _query_rankings(session):
    """Compute per-season and all-time rankings in a single SQL statement.

    The heavy lifting stays in the database:

    * one aggregation over ``GROUPING SETS`` produces per-``(user, season)``
      rows *and* per-``user`` all-time rows (the latter carry ``season IS
      NULL``) in a single pass, with the median response delay computed via
      ``percentile_cont``;
    * answerable-event counts per season are joined in to derive the response
      rate (left undefined for the all-time window);
    * three ``dense_rank()`` window functions partitioned by window rank each
      metric independently.

    Eligibility (>= :data:`MIN_POSITIVE_RESPONSES` positive answers all-time)
    is read from each user's all-time row and broadcast across their season
    rows with a windowed ``max`` so the filter applies uniformly.
    """
    season = _season_expr(models.EventDB.date)
    delay_seconds = extract("epoch", models.ResponseDB.date - models.EventDB.created_at)

    # 1. Per-(user, season) rows AND per-user all-time rows (season IS NULL)
    #    in a single pass via GROUPING SETS.
    metrics = (
        select(
            models.ResponseDB.user_id.label("user_id"),
            season.label("season"),
            sql_fn.count().label("n_responses"),
            sql_fn.coalesce(
                sql_fn.sum(cast(models.ResponseDB.value, Integer)), 0
            ).label("n_positive"),
            func.percentile_cont(0.5)  # pylint: disable=not-callable
            .within_group(delay_seconds)
            .label("median_seconds"),
        )
        .join(models.EventDB, models.ResponseDB.event_id == models.EventDB.id)
        .join(models.UserDB, models.UserDB.id == models.ResponseDB.user_id)
        .where(models.UserDB.is_active)
        .where(models.EventDB.is_in_doodle.is_(True))
        .group_by(
            func.grouping_sets(  # pylint: disable=not-callable
                tuple_(models.ResponseDB.user_id, season),
                tuple_(models.ResponseDB.user_id),
            )
        )
        .cte("metrics")
    )

    # 2. Answerable events per season, the response-rate denominator.
    event_counts = (
        select(season.label("season"), sql_fn.count().label("n_events"))
        .where(models.EventDB.is_in_doodle.is_(True))
        .group_by(season)
        .cte("event_counts")
    )

    # 3. Derive response rate and broadcast the all-time positive count.
    all_time_positive = sql_fn.max(
        case((metrics.c.season.is_(None), metrics.c.n_positive))
    ).over(partition_by=metrics.c.user_id)
    response_rate = case(
        (
            metrics.c.season.isnot(None) & (event_counts.c.n_events > 0),
            cast(metrics.c.n_responses, Float) / event_counts.c.n_events,
        )
    )
    enriched = (
        select(
            metrics.c.user_id,
            metrics.c.season,
            metrics.c.n_responses,
            metrics.c.n_positive,
            metrics.c.median_seconds,
            response_rate.label("response_rate"),
            all_time_positive.label("all_time_positive"),
        )
        .join(event_counts, event_counts.c.season == metrics.c.season, isouter=True)
        .cte("enriched")
    )

    # 4. Keep eligible members, then dense-rank each metric within its window.
    eligible = (
        select(enriched)
        .where(enriched.c.all_time_positive >= MIN_POSITIVE_RESPONSES)
        .cte("eligible")
    )
    ranked = select(
        eligible.c.user_id,
        eligible.c.season,
        eligible.c.n_positive,
        eligible.c.median_seconds,
        eligible.c.response_rate,
        sql_fn.dense_rank()
        .over(
            partition_by=eligible.c.season,
            order_by=eligible.c.median_seconds.asc().nulls_last(),
        )
        .label("reactivity_rank"),
        sql_fn.dense_rank()
        .over(
            partition_by=eligible.c.season,
            order_by=eligible.c.response_rate.desc().nulls_last(),
        )
        .label("response_rate_rank"),
        sql_fn.dense_rank()
        .over(
            partition_by=eligible.c.season,
            order_by=eligible.c.n_positive.desc(),
        )
        .label("positive_rank"),
    )

    return session.execute(ranked).all()


@stats_router.get(
    "/rankings",
    response_model=UserRankings,
    dependencies=[
        Depends(Authorization(Action.VIEW, Resource.EVENT)),
        Depends(Authorization(Action.VIEW, Resource.PROFILE)),
        # Rankings are aggregated response data (counts, positive answers,
        # response delays), so seeing them requires the same permission as
        # seeing individual responses. Notably excludes the eleves role.
        Depends(Authorization(Action.VIEW, Resource.RESPONSE)),
        Depends(get_s3_helper),
    ],
)
async def get_user_rankings(
    session: SessionDep,
) -> UserRankings:
    """Rank active members by how they engage with events, per season.

    For each season (plus an all-time window) members are ranked on three
    metrics, in order of the values we want to encourage:

    * **Reactivity** — median delay between an event being published and the
      member answering it (yes or no). Answering quickly lets the bagad commit
      to organisers, so this is the primary metric.
    * **Response rate** — share of the season's answerable events the member
      responded to. Per-season only (a cross-season rate is meaningless), so
      it is omitted from the all-time window.
    * **Positive responses** — absolute count of "yes" answers, i.e. turnouts.
      Secondary, but tracked because outings keep the group alive.

    Only members with at least :data:`MIN_POSITIVE_RESPONSES` positive
    responses all-time appear, to avoid ranking one-off participants.
    """
    ranked_rows = _query_rankings(session)
    if not ranked_rows:
        return UserRankings(seasons=[])

    profiles = _load_profiles(session, {row.user_id for row in ranked_rows})

    # Group rows into windows: a NULL season is the all-time window, which we
    # place last; individual seasons come newest-first.
    items_by_window: dict[int | None, list[UserRankingItem]] = defaultdict(list)
    for row in ranked_rows:
        profile = profiles.get(row.user_id)
        if profile is None:
            continue
        items_by_window[row.season].append(
            UserRankingItem(
                user=profile,
                ranks=RankingInfo(
                    median_response_time=(
                        timedelta(seconds=row.median_seconds)
                        if row.median_seconds is not None
                        else None
                    ),
                    median_response_time_rank=row.reactivity_rank,
                    response_rate=row.response_rate,
                    response_rate_rank=row.response_rate_rank,
                    n_positive_responses=row.n_positive,
                    n_positive_responses_rank=row.positive_rank,
                ),
            )
        )

    seasons = sorted((s for s in items_by_window if s is not None), reverse=True)
    ordered_windows: list[int | None] = [*seasons, None]

    return UserRankings(
        seasons=[
            SeasonRanking(season=window, items=items_by_window[window])
            for window in ordered_windows
            if window in items_by_window
        ]
    )


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
    group_db = models.GroupDB(
        name=group.name, color=group.color, is_instrument=group.is_instrument
    )
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
    group_db.is_instrument = group.is_instrument
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
