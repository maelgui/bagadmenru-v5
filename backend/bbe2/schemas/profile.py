from pydantic import BaseModel


class _ProfileBase(BaseModel):
    first_name: str
    last_name: str
    email: str | None
    picture: str | None


class ProfileCreate(_ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    picture: str | None


class Profile(_ProfileBase):
    id: str

    class Config:
        orm_mode = True
