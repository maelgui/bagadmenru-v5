from pydantic import BaseModel, ConfigDict

class LoginData(BaseModel):
    identifier: str
    password: str
