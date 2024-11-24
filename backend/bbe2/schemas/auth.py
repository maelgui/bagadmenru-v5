from datetime import datetime
from enum import Enum
from typing import Optional, Self

from pydantic import BaseModel, model_validator


class ResetPasswordRequest(BaseModel):
    email: str


class ResetPassword(BaseModel):
    email: str
    password: Optional[str]
    password_confirm: Optional[str]
    token: Optional[str]


class LoginType(Enum):
    PASSWORD = "password"
    PASSKEY = "passkey"


class LoginData(BaseModel):
    type: LoginType
    email: str
    password: Optional[str] = None
    passkey: Optional[str] = None

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.type == LoginType.PASSWORD and (not self.password):
            raise ValueError("Missing password field")
        elif self.type == LoginType.PASSKEY and (not self.passkey):
            raise ValueError("Missing passkey field")
        return self


class Token(BaseModel):
    access_token: str
    token_type: str


class JwtPayload(BaseModel):
    sub: str
    roles: list[str]
    first_name: str
    last_name: str
    iat: datetime
    exp: datetime
