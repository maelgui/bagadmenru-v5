from datetime import datetime
from enum import Enum
from typing import Optional, Self

from pydantic import BaseModel, model_validator


class ResetPasswordRequest(BaseModel):
    email: str


class ResetPassword(BaseModel):
    email: str
    password: str
    password_confirm: str

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        pw1 = self.password
        pw2 = self.password_confirm
        if pw1 is not None and pw2 is not None and pw1 != pw2:
            raise ValueError("passwords do not match")
        return self


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

    Defaults to the active account when omitted.
    """

    account_id: Optional[str] = None


class JwtPayload(BaseModel):
    sub: str
    roles: list[str]
    first_name: str
    last_name: str
    # Optional so tokens issued before email was added still validate - existing
    # sessions must not be logged out on deploy. New tokens always carry it.
    email: Optional[str] = None
    iat: datetime
    exp: datetime
