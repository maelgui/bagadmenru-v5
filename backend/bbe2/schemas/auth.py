from datetime import datetime

from pydantic import BaseModel


class LoginData(BaseModel):
    identifier: str
    password: str

class SessionData(BaseModel):
    identifier: str
    permissions: list[str]
    email: str
