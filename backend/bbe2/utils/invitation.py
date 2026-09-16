"""Service helpers for the self-service member invitation flow.

Groups the token/OTP mechanics behind small functions so the endpoint handlers
in ``api/v1/endpoints/invitations.py`` stay thin and read as a sequence of
intent-revealing calls. Two token kinds are involved:

* ``Invitation`` - single-use, carries an :class:`InvitationPayload`
  (channel/email_proven/email) plus transient OTP bookkeeping.
* ``EmailVerification`` - the short-lived one-time code proving a submitted
  email when the invitation did not.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from bbe2.models.action_token import ActionTokenDB, ActionTokenValue
from bbe2.models.user import UserDB
from bbe2.schemas.invitation import InvitationPayload
from bbe2.services.otp import (
    OTP_MAX_AGE,
    OTP_MAX_ATTEMPTS,
    OtpAttempt,
    OtpService,
    generate_otp,
    hash_otp,
)
from bbe2.utils.action_token import (
    create_action_token,
    peek_action_token,
    revoke_action_token,
)

# Re-exported for existing importers; the primitives now live in
# ``bbe2.services.otp`` so the account-recovery login code can share them.
__all__ = [
    "OTP_MAX_AGE",
    "OTP_MAX_ATTEMPTS",
    "generate_otp",
    "hash_otp",
]
# Minimum delay between two OTP requests for the same invitation. Prevents an
# email-send loop (each request emails a code) without external rate limiting:
# the last-sent timestamp is tracked in the invitation's own payload. The
# attempt counter (OTP_MAX_ATTEMPTS) separately caps guessing of a sent code.
OTP_RESEND_COOLDOWN = 60  # seconds


def email_exists(session: DbSession, email: str) -> bool:
    """Whether an active-or-not account already uses ``email``."""
    return (
        session.scalars(select(UserDB).where(UserDB.email == email)).first() is not None
    )


def create_invitation_token(session: DbSession, payload: InvitationPayload) -> str:
    """Persist an invitation token and return its raw value."""
    return create_action_token(
        session,
        ActionTokenValue.Invitation,
        payload.model_dump(mode="json"),
    )


def peek_invitation(session: DbSession, token: str) -> ActionTokenDB:
    """Return the valid invitation token row, or raise 404.

    Does not consume the token (the invitation is single-use and is only
    consumed on successful accept). Callers that need the typed payload read it
    with ``InvitationPayload.model_validate(row.payload)``; the row itself is
    returned because two of the three callers must also mutate it (OTP
    bookkeeping, ``used_at``).
    """
    row = peek_action_token(session, token, ActionTokenValue.Invitation)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation invalide ou expirée.",
        )
    return row


def issue_otp(session: DbSession, invitation: ActionTokenDB, email: str) -> str:
    """Create a fresh OTP for ``email`` bound to ``invitation``; return the code.

    Supersedes any previous OTP for this invitation and records the send time on
    the invitation payload (for the resend cooldown). Enforces the cooldown and
    rejects an already-registered address.
    """
    if email_exists(session, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe déjà pour cette adresse email.",
        )

    now = datetime.now(timezone.utc)
    last_sent_raw = invitation.payload.get("last_otp_sent_at")
    if last_sent_raw:
        elapsed = (now - datetime.fromisoformat(last_sent_raw)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN:
            retry_after = int(OTP_RESEND_COOLDOWN - elapsed) or 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Un code a déjà été envoyé récemment. "
                    "Merci de patienter avant d'en demander un nouveau."
                ),
                headers={"Retry-After": str(retry_after)},
            )

    prev = invitation.payload.get("otp_token")
    if prev:
        revoke_action_token(session, prev)

    code = generate_otp()
    otp_token = create_action_token(
        session,
        ActionTokenValue.EmailVerification,
        {
            "email": email,
            "code_hash": hash_otp(code),
            "attempts_left": OTP_MAX_ATTEMPTS,
            "invitation_hash": invitation.token_hash,
        },
        expires_in=OTP_MAX_AGE,
    )
    # Reassign (not mutate) so SQLAlchemy tracks the JSON change.
    invitation.payload = {
        **invitation.payload,
        "otp_token": otp_token,
        "last_otp_sent_at": now.isoformat(),
    }
    return code


def verify_otp(
    session: DbSession,
    invitation: ActionTokenDB,
    email: str,
    code: Optional[str],
) -> None:
    """Validate the submitted OTP for ``email`` or raise 400. Consumes it on success."""
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code de vérification requis.",
        )

    otp_token = invitation.payload.get("otp_token")
    otp_row = (
        peek_action_token(session, otp_token, ActionTokenValue.EmailVerification)
        if otp_token
        else None
    )
    if otp_row is None or not isinstance(otp_token, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun code valide. Demandez un nouveau code.",
        )

    otp_payload = otp_row.payload
    # The code is bound to the exact address it was sent to.
    if otp_payload.get("email") != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code ne correspond pas à cette adresse.",
        )

    # Shared attempt state machine (services/otp.py): burns one attempt per
    # mismatch and revokes the OTP once exhausted, committing failed attempts
    # itself (they must survive the raises below). Expiry is the OTP token's
    # own TTL, enforced by the row lookup above. Built on the session rather
    # than injected: this helper is plumbing already handed the request's
    # session by the endpoint.
    outcome = OtpService(session).verify(otp_row, code)
    if outcome is OtpAttempt.EXHAUSTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trop de tentatives. Demandez un nouveau code.",
        )
    if outcome is not OtpAttempt.OK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code incorrect.",
        )

    # Correct code: consume the OTP.
    revoke_action_token(session, otp_token)


def is_email_proven(payload: InvitationPayload, email: str) -> bool:
    """Whether ``email`` is already proven by the invitation (emailed & unchanged)."""
    return payload.email_proven and email == payload.email
