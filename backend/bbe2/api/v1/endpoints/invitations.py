"""Self-service member invitation endpoints.

Flow overview (single ``CREATE:INVITATION`` permission for both paths):

1. ``POST /invitations`` (authenticated member) creates a single-use
   :class:`ActionTokenValue.Invitation` token. ``channel=link`` returns the
   token/URL for the caller to share (QR, WhatsApp, ...); ``channel=email`` has
   the backend email it, which proves that address.

2. ``GET /invitations/{token}`` (public) validates the token without consuming
   it and returns the (email) prefill plus whether the email is proven/locked.

3. ``POST /invitations/{token}/otp`` (public) emails a 6-digit code to the
   address the invitee entered. Used whenever the email is not proven.

4. ``POST /invitations/{token}/accept`` (public) creates the account (instrument
   + default groups only) and signs the member in as an additive session. OTP is
   required unless the invitation email was proven and left unchanged.

The token/OTP mechanics live in :mod:`bbe2.utils.invitation`; this module is
just the HTTP layer.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status

from bbe2 import models
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.models.action_token import ActionTokenValue
from bbe2.schemas.auth import Token
from bbe2.schemas.invitation import (
    InvitationAccept,
    InvitationChannel,
    InvitationCreate,
    InvitationCreated,
    InvitationInfo,
    InvitationPayload,
    OtpRequest,
)
from bbe2.services import membership as membership_service
from bbe2.utils.auth import (
    Action,
    Authorization,
    Resource,
    create_access_token,
    set_session_cookies,
)
from bbe2.utils.groups import resolve_groups_with_defaults
from bbe2.utils.invitation import (
    create_invitation_token,
    email_exists,
    is_email_proven,
    issue_otp,
    peek_invitation,
    verify_otp,
)
from bbe2.utils.templates import EmailData

router = APIRouter(prefix="/invitations")


def _signup_url(settings, token: str) -> str:
    return f"{str(settings.frontend_base_url).rstrip('/')}/invite/{token}"


@router.post(
    "",
    response_model=InvitationCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(Authorization(Action.CREATE, Resource.INVITATION))],
)
async def create_invitation(
    body: InvitationCreate,
    session: SessionDep,
    settings: SettingsDep,
    sender: SenderDep,
) -> InvitationCreated:
    """Generate an invitation and (for the email channel) send it."""
    if body.channel is InvitationChannel.EMAIL and not body.email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une adresse email est requise pour l'envoi par email.",
        )

    # Verify at generation time that the address is free, so the invitee does
    # not fill the whole form only to be rejected at the end.
    if body.email and email_exists(session, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà pour cette adresse email.",
        )

    # The email is proven only when *we* email the invitation to that address.
    email_proven = body.channel is InvitationChannel.EMAIL
    token = create_invitation_token(
        session,
        InvitationPayload(
            channel=body.channel, email_proven=email_proven, email=body.email
        ),
    )
    session.commit()

    url = _signup_url(settings, token)

    if body.channel is InvitationChannel.EMAIL and body.email is not None:
        await sender.batch_send_emails(
            subject="[bagadmenru] Vous êtes invité·e à rejoindre le Bagad Men Ru",
            template_name="email_invitation",
            template_data=[
                EmailData(
                    to=body.email,
                    template_data={"url": url, "first_name": body.first_name},
                )
            ],
        )

    return InvitationCreated(
        token=token,
        url=url,
        channel=body.channel,
        expires_in=ActionTokenValue.Invitation.max_age,
    )


@router.get("/{token}", response_model=InvitationInfo)
async def get_invitation(token: str, session: SessionDep) -> InvitationInfo:
    """Public: return prefill data for the signup form (does not consume)."""
    row = peek_invitation(session, token)
    payload = InvitationPayload.model_validate(row.payload)
    return InvitationInfo.from_payload(payload)


@router.post("/{token}/otp", status_code=status.HTTP_204_NO_CONTENT)
async def request_otp(
    token: str,
    body: OtpRequest,
    session: SessionDep,
    sender: SenderDep,
) -> None:
    """Public: send a one-time code to the address the invitee entered.

    A fresh code supersedes any previous one for this invitation, so only the
    latest is valid.
    """
    invitation = peek_invitation(session, token)
    payload = InvitationPayload.model_validate(invitation.payload)

    # An emailed, unchanged address is already proven; no OTP needed.
    if is_email_proven(payload, body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette adresse est déjà vérifiée.",
        )

    code = issue_otp(session, invitation, body.email)
    session.commit()

    await sender.batch_send_emails(
        subject="[bagadmenru] Votre code de vérification",
        template_name="email_otp",
        template_data=[EmailData(to=body.email, template_data={"code": code})],
    )


@router.post("/{token}/accept", status_code=status.HTTP_201_CREATED)
async def accept_invitation(
    token: str,
    body: InvitationAccept,
    response: Response,
    session: SessionDep,
    settings: SettingsDep,
) -> Token:
    """Public: create the member account from the invitation and sign them in.

    OTP is required unless the invitation email was backend-proven and the
    submitted email is unchanged. The account gets its instrument plus the
    default groups only (never a privileged role). On success the new member is
    signed in as an *additive* multi-account session (no other account is logged
    out) and becomes the active account - no password is set and no email is
    sent, the account is passkey-first.
    """
    invitation = peek_invitation(session, token)
    payload = InvitationPayload.model_validate(invitation.payload)

    if not is_email_proven(payload, body.email):
        verify_otp(session, invitation, body.email, body.code)

    # Guard against a race: the address may have been taken since generation.
    if email_exists(session, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà pour cette adresse email.",
        )

    profile_db = models.UserDB(
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        instrument_id=body.instrument_id,
    )
    # Instrument group + default groups only (shared "requested + defaults"
    # rule). Defense in depth: never attach a group granting the admin role,
    # even if one was misconfigured as default.
    resolved_groups = resolve_groups_with_defaults(session, [body.instrument_id])
    profile_db.groups = [
        g for g in resolved_groups if all(r.id != "admin" for r in g.roles)
    ]
    session.add(profile_db)
    # Flush so the new user's primary key is populated (it is a Python-side
    # ``default`` applied at INSERT, so ``profile_db.id`` is None until flush);
    # the auto-link below sets it as the membership's foreign key.
    session.flush()

    # Attach any HelloAsso membership ingested earlier that was waiting for this
    # adherent (matched on the adherent email), so the new member sees their
    # adhesion without an admin having to link it manually.
    membership_service.link_orphan_memberships_for_user(session, profile_db)

    # Consume the invitation (single-use) now that the account exists.
    invitation.used_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(profile_db)

    # Sign the new member in as an additive session and make them the active
    # account, without logging out any other account in the browser (family
    # devices). The client then enrols a passkey as this (now active) member.
    access_token = create_access_token(profile_db, settings)
    set_session_cookies(response, profile_db.id, access_token, settings)
    return Token(access_token=access_token, token_type="bearer")
