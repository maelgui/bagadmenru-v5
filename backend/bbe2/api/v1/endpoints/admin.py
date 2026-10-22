"""Administration area: cross-member audit and system status.

Every route here requires ``VIEW:ADMIN`` (mutations ``EDIT:ADMIN``), which no
role in the ROLE_PERMISSIONS table holds -- only ``admin`` does, through the
blanket grant. Keep member-facing or staff-facing endpoints in their own
modules; this one only aggregates for the admin screens.
"""

import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from bbe2 import models, schemas
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.models.user import user_group_association_table
from bbe2.schemas.file import FileOrFolderType
from bbe2.schemas.profile import MinimalGroup
from bbe2.services import membership as membership_service
from bbe2.services.mailing import ovh_configured
from bbe2.utils.auth import Authorization, get_current_profile
from bbe2.utils.permissions import Action, Resource, get_permissions_for_roles
from bbe2.utils.templates import EmailData

router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ADMIN))],
)

EDIT_ADMIN = Depends(Authorization(Action.EDIT, Resource.ADMIN))


def _count(session, stmt) -> int:
    total = func.count()  # pylint: disable=not-callable
    return session.scalar(select(total).select_from(stmt.subquery())) or 0


def _count_by_user(session, column) -> dict[str, int]:
    rows = session.execute(
        select(column, func.count()).group_by(column)  # pylint: disable=not-callable
    ).all()
    return {user_id: n for user_id, n in rows if user_id is not None}


def _passkeys_by_user(session) -> dict[str, int]:
    total = func.count(models.PasskeyDB.credential_id)  # pylint: disable=not-callable
    rows = session.execute(
        select(models.UserDB.id, total)
        .join(
            models.PasskeyDB,
            models.PasskeyDB.passkey_user_id == models.UserDB.passkey_user_id,
        )
        .group_by(models.UserDB.id)
    ).all()
    return dict(rows)


def _active_api_keys_by_user(session) -> dict[str, int]:
    rows = session.execute(
        select(models.ApiKeyDB.user_id, func.count())  # pylint: disable=not-callable
        .where(models.ApiKeyDB.revoked_at.is_(None))
        .group_by(models.ApiKeyDB.user_id)
    ).all()
    return dict(rows)


@router.get("/overview", response_model=schemas.AdminOverview)
async def get_overview(session: SessionDep) -> schemas.AdminOverview:
    users = session.scalars(select(models.UserDB)).all()
    passkeys = _passkeys_by_user(session)
    pushes = _count_by_user(session, models.PushSubscriptionDB.user_id)
    api_keys = _active_api_keys_by_user(session)
    membership_info = membership_service.compute_info_by_user(session)

    with_passkey = sum(1 for u in users if passkeys.get(u.id, 0) > 0)
    with_password = sum(1 for u in users if u.password)
    without_credential = sum(
        1 for u in users if not u.password and passkeys.get(u.id, 0) == 0
    )
    active_memberships = sum(
        1
        for info in membership_info.values()
        if info.status == schemas.MembershipStatus.ACTIVE
    )

    return schemas.AdminOverview(
        members_total=len(users),
        members_active=sum(1 for u in users if u.is_active),
        members_inactive=sum(1 for u in users if not u.is_active),
        members_with_passkey=with_passkey,
        members_with_password=with_password,
        members_without_credential=without_credential,
        groups=_count(session, select(models.GroupDB.id)),
        roles=_count(session, select(models.RoleDB.id)),
        api_keys_active=sum(api_keys.values()),
        push_subscriptions=sum(pushes.values()),
        members_with_push=len(pushes),
        memberships_active_season=active_memberships,
        unlinked_memberships=_count(
            session,
            select(models.HelloAssoMembershipDB.id).where(
                models.HelloAssoMembershipDB.user_id.is_(None)
            ),
        ),
        events=_count(session, select(models.EventDB.id)),
        files=_count(
            session,
            select(models.FileOrFolderDB.id).where(
                models.FileOrFolderDB.type == FileOrFolderType.FILE
            ),
        ),
    )


@router.get("/roles", response_model=list[schemas.RoleDetail])
async def list_role_details(session: SessionDep) -> list[schemas.RoleDetail]:
    roles = session.scalars(select(models.RoleDB).order_by(models.RoleDB.id)).all()
    groups = session.scalars(
        select(models.GroupDB)
        .order_by(models.GroupDB.name)
        .options(selectinload(models.GroupDB.roles))
    ).all()
    groups_by_role: dict[str, list[models.GroupDB]] = {}
    for group in groups:
        for role in group.roles:
            groups_by_role.setdefault(role.id, []).append(group)
    group_members = session.execute(
        select(
            user_group_association_table.c.group_id,
            user_group_association_table.c.profile_id,
        )
        .join(
            models.UserDB,
            models.UserDB.id == user_group_association_table.c.profile_id,
        )
        .where(models.UserDB.is_active)
    ).all()
    members_by_group: dict[int, set[str]] = {}
    for group_id, profile_id in group_members:
        members_by_group.setdefault(group_id, set()).add(profile_id)

    details = []
    for role in roles:
        role_groups = groups_by_role.get(role.id, [])
        members: set[str] = set()
        for group in role_groups:
            members |= members_by_group.get(group.id, set())
        details.append(
            schemas.RoleDetail(
                id=role.id,
                description=role.description,
                permissions=get_permissions_for_roles([role.id]),
                groups=[MinimalGroup.model_validate(g) for g in role_groups],
                member_count=len(members),
            )
        )
    return details


@router.get("/members", response_model=list[schemas.AdminMember])
async def list_members(session: SessionDep) -> list[schemas.AdminMember]:
    users = session.scalars(
        select(models.UserDB)
        .order_by(models.UserDB.last_name, models.UserDB.first_name)
        .options(
            selectinload(models.UserDB.groups), selectinload(models.UserDB.instrument)
        )
    ).all()
    passkeys = _passkeys_by_user(session)
    pushes = _count_by_user(session, models.PushSubscriptionDB.user_id)
    api_keys = _active_api_keys_by_user(session)
    membership_info = membership_service.compute_info_by_user(session)

    members = []
    for user in users:
        info = membership_info.get(user.id)
        members.append(
            schemas.AdminMember(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                is_active=user.is_active,
                receives_emails=user.receives_emails,
                has_password=bool(user.password),
                passkey_count=passkeys.get(user.id, 0),
                push_subscription_count=pushes.get(user.id, 0),
                api_key_count=api_keys.get(user.id, 0),
                membership_status=(
                    info.status if info else schemas.MembershipStatus.NONE
                ),
                membership_active_season=info.active_season if info else None,
                instrument=(
                    MinimalGroup.model_validate(user.instrument)
                    if user.instrument
                    else None
                ),
                groups=[MinimalGroup.model_validate(g) for g in user.groups],
            )
        )
    return members


@router.get("/api-keys", response_model=list[schemas.AdminApiKey])
async def list_api_keys(session: SessionDep) -> list[schemas.AdminApiKey]:
    keys = session.scalars(
        select(models.ApiKeyDB)
        .where(models.ApiKeyDB.revoked_at.is_(None))
        .order_by(models.ApiKeyDB.created_at.desc())
        .options(selectinload(models.ApiKeyDB.user))
    ).all()
    return [
        schemas.AdminApiKey(
            **schemas.ApiKey.model_validate(key).model_dump(),
            owner=schemas.ApiKeyOwner(
                id=key.user.id,
                first_name=key.user.first_name,
                last_name=key.user.last_name,
            ),
        )
        for key in keys
    ]


@router.delete(
    "/api-keys/{key_hash}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[EDIT_ADMIN],
)
async def revoke_api_key(key_hash: str, session: SessionDep) -> None:
    key = session.get(models.ApiKeyDB, key_hash)
    if key is None or key.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    key.revoked_at = datetime.now(tz=timezone.utc)
    session.commit()


@router.get("/system", response_model=schemas.SystemStatus)
async def get_system_status(settings: SettingsDep) -> schemas.SystemStatus:
    smtp_auth = "" if settings.smtp_username else " · sans authentification"
    integrations = [
        schemas.IntegrationStatus(
            key="smtp",
            label="Envoi d'e-mails (SMTP)",
            configured=not settings.email_dry_run,
            detail=(
                "Mode simulation : aucun e-mail n'est envoyé"
                if settings.email_dry_run
                else f"{settings.smtp_host}:{settings.smtp_port}{smtp_auth}"
            ),
        ),
        schemas.IntegrationStatus(
            key="imap",
            label="Boîte de réception (IMAP)",
            configured=bool(settings.imap_username and settings.imap_password),
            detail=f"{settings.imap_host}:{settings.imap_port}",
        ),
        schemas.IntegrationStatus(
            key="ovh",
            label="Mailing lists (OVH)",
            configured=ovh_configured(settings),
        ),
        schemas.IntegrationStatus(
            key="push",
            label="Notifications push (VAPID)",
            configured=bool(settings.vapid_private_key and settings.vapid_public_key),
            detail=settings.vapid_claims_email,
        ),
        schemas.IntegrationStatus(
            key="helloasso",
            label="Adhésions HelloAsso",
            configured=bool(
                settings.helloasso_signature_key or settings.helloasso_webhook_token
            ),
        ),
        schemas.IntegrationStatus(
            key="cercle",
            label="Adhésions Cercle Montfortais",
            configured=bool(settings.cercle_webhook_secret),
        ),
        schemas.IntegrationStatus(
            key="musescore",
            label="Rendu des partitions (MuseScore)",
            configured=settings.musescore_renderer_url is not None,
            detail=(
                str(settings.musescore_renderer_url)
                if settings.musescore_renderer_url
                else None
            ),
        ),
        schemas.IntegrationStatus(
            key="drumscore",
            label="Rendu des partitions (DrumScore)",
            configured=settings.drumscore_renderer_url is not None,
            detail=(
                str(settings.drumscore_renderer_url)
                if settings.drumscore_renderer_url
                else None
            ),
        ),
        schemas.IntegrationStatus(
            key="s3",
            label="Stockage des fichiers (S3)",
            configured=bool(settings.s3_bucket_name),
            detail=f"{settings.s3_endpoint} · {settings.s3_bucket_name}",
        ),
    ]
    return schemas.SystemStatus(
        environment=settings.environment.value,
        version=os.environ.get("APP_VERSION", "dev"),
        integrations=integrations,
    )


@router.post(
    "/notifications/test-email",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[EDIT_ADMIN],
)
async def send_test_email(
    sender: SenderDep,
    current_user: Annotated[models.UserDB, Depends(get_current_profile)],
) -> None:
    await sender.batch_send_emails(
        subject="Test - Bagad Men Ru",
        template_name="email_test",
        template_data=[
            EmailData(
                to=current_user.email,
                template_data={"first_name": current_user.first_name},
            )
        ],
    )
