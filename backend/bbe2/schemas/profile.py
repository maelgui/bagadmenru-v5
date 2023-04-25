from pydantic import BaseModel


class _ProfileBase(BaseModel):
    name: str | None
    picture: str | None

class ProfileCreate(_ProfileBase):
    pass

class ProfileUpdate(_ProfileBase):
    pass

class Profile(_ProfileBase):
    id: str

    class Config:
        orm_mode = True
