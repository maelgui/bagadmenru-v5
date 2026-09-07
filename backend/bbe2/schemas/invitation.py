"""Schemas for the self-service member invitation flow.

Two delivery paths share a single permission (``CREATE:INVITATION``):

* **Link / QR** - the backend returns the signup link and lets the inviter share
  it by any channel (shown in person, WhatsApp, SMS, ...). The target email is
  *not* proven, so completing the signup requires an emailed one-time code
  (OTP).
* **Emailed invitation** - the backend sends the invitation email itself, which
  proves control of that address. Signing up with the *same* address skips the
  OTP. Changing the email on the form falls back to OTP.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class InvitationChannel(str, Enum):
    """How the invitation is delivered, which drives whether an email is proven."""

    # Link/QR handed to the inviter; target email unproven -> OTP required.
    LINK = "link"
    # Backend sends the invitation email; that address is proven -> OTP skipped
    # only if the signup finalizes with the very same address.
    EMAIL = "email"


class InvitationCreate(BaseModel):
    """Request to generate an invitation (authenticated member action).

    ``channel`` selects delivery: ``LINK`` returns the signup link/QR to the
    caller; ``EMAIL`` sends the invitation to ``email`` (which then must be
    provided). ``first_name`` is optional and only used to personalise the
    emailed invitation - it is not persisted on the token nor used to prefill
    the signup form (the invitee fills in their own profile).
    """

    channel: InvitationChannel = InvitationChannel.LINK
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, v: Optional[str]) -> Optional[str]:
        # Normalize before EmailStr validation so surrounding whitespace and
        # casing never cause a spurious rejection; an empty string becomes None.
        if v is None:
            return None
        v = v.strip().lower()
        return v or None


class InvitationPayload(BaseModel):
    """Typed contents of an ``Invitation`` action token's JSON payload.

    Single source of truth for what we persist at generation time and read back
    when the invitee opens the link, so the two sides cannot drift. Extra keys
    are ignored: the endpoint also stashes transient OTP bookkeeping
    (``otp_token``, ``last_otp_sent_at``) on the same row, which is not part of
    the invitation's identity.
    """

    model_config = ConfigDict(extra="ignore")

    channel: InvitationChannel
    # True only when the backend itself emailed the invitation to ``email``
    # (that address is then proven). For link/QR it is False.
    email_proven: bool = False
    email: Optional[EmailStr] = None


class InvitationCreated(BaseModel):
    """Response after generating an invitation.

    ``token`` and ``url`` are only meaningful for the ``LINK`` channel (the
    caller shares them). For the ``EMAIL`` channel the invitation was sent by the
    backend; the token is still returned for testing/debugging but the UI need
    not surface it.
    """

    token: str
    url: str
    channel: InvitationChannel
    expires_in: int  # seconds until the invitation expires


class InvitationInfo(BaseModel):
    """Public prefill data returned when opening a signup link.

    Contains no secrets. ``email_locked`` is true only when the invitation email
    was proven (EMAIL channel with a target address): the signup form then shows
    the address read-only and no OTP is needed as long as it is unchanged.
    """

    model_config = ConfigDict(from_attributes=True)

    email: Optional[str] = None
    email_locked: bool = False

    @classmethod
    def from_payload(cls, payload: "InvitationPayload") -> "InvitationInfo":
        """Build the public prefill view from a validated invitation payload."""
        return cls(
            email=payload.email,
            # Locked (read-only, OTP-free) only when we proved the address.
            email_locked=payload.email_proven and payload.email is not None,
        )


class OtpRequest(BaseModel):
    """Request an email verification code for the address the invitee entered."""

    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        # Normalize before EmailStr validation (strip/lowercase).
        return v.strip().lower() if isinstance(v, str) else v


class InvitationAccept(BaseModel):
    """Finalize a signup: create the account from the invitation.

    ``code`` is the 6-digit OTP; it is required whenever the email is not proven
    (link/QR, or an EMAIL-channel invitation whose address was changed on the
    form). It is ignored when the email is proven and unchanged.
    """

    first_name: str
    last_name: str
    email: EmailStr
    instrument_id: int
    code: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        # Normalize before EmailStr validation (strip/lowercase).
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("first_name", "last_name")
    @classmethod
    def _strip_names(cls, v: str) -> str:
        return v.strip()
