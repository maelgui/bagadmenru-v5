from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Literal, Optional, Self

from pydantic import AwareDatetime, BaseModel, model_validator


class ResetPasswordRequest(BaseModel):
    email: str


class RecoveryGrant(BaseModel):
    """Response of ``POST /auth/reset_password_request``.

    ``grant_id`` publicly identifies the recovery request (RFC 8628's
    device_code/user_code split: the grant is the identifier, the emailed
    6-digit code is the only secret). Unknown emails get a random,
    indistinguishable grant id so the response never reveals whether an
    account exists.
    """

    grant_id: str


class LoginCode(BaseModel):
    """Body of ``POST /auth/login_code`` (single recovery sign-in endpoint).

    ``via`` only labels the funnel metric (code typed by hand vs the emailed
    link, which is the same call with both fields prefilled in its URL). It is
    client-declared and carries no security meaning.
    """

    grant_id: str
    code: str
    via: Literal["code", "link"] = "code"


class SetPassword(BaseModel):
    """Body of ``POST /auth/set_password`` (authenticated, no current password).

    No confirmation field: the form has a show-password toggle, which is the
    modern guard against typos (NIST 800-63B dropped the double-entry
    recommendation once masking can be lifted).
    """

    password: str


class LoginType(Enum):
    PASSWORD = "password"
    PASSKEY = "passkey"


class LoginData(BaseModel):
    type: LoginType
    email: Optional[str] = None
    password: Optional[str] = None
    passkey: Optional[str] = None

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.type == LoginType.PASSWORD and (not self.password or not self.email):
            raise ValueError("Missing password field")
        elif self.type == LoginType.PASSKEY and (not self.passkey):
            raise ValueError("Missing passkey field")
        return self


class Token(BaseModel):
    access_token: str
    token_type: str


class SessionInfo(BaseModel):
    """One signed-in account in the current browser (multi-account)."""

    id: str
    first_name: str
    last_name: str
    # None for sessions whose token predates the email claim (until reissued).
    email: Optional[str] = None
    active: bool


class LogoutRequest(BaseModel):
    """Optional logout body naming which account to sign out.

    Defaults to the active account when omitted. When ``all`` is true, every
    account signed in this browser is signed out (``account_id`` is ignored);
    this only clears cookies in the current browser and does not revoke sessions
    on other devices.
    """

    account_id: Optional[str] = None
    all: bool = False


class JwtPayload(BaseModel):
    sub: str
    roles: list[str]
    first_name: str
    last_name: str
    # Optional so tokens issued before email was added still validate - existing
    # sessions must not be logged out on deploy. New tokens always carry it.
    email: Optional[str] = None
    # AwareDatetime: epoch ints from jwt.decode become tz-aware UTC datetimes,
    # so freshness math never has to worry about naive values.
    iat: AwareDatetime
    exp: AwareDatetime

    def issued_within(self, max_age: timedelta) -> bool:
        """Whether this session is younger than ``max_age`` (fresh sign-in)."""
        return datetime.now(timezone.utc) - self.iat <= max_age
