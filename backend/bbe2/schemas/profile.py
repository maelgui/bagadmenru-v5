from pydantic import BaseModel


class Instrument(BaseModel):
    id: int
    name: str
    color: str

    class Config:
        orm_mode = True


class _ProfileBase(BaseModel):
    picture: str | None
    instrument_id: int | None


class ProfileCreate(_ProfileBase):
    pass


class ProfileUpdate(_ProfileBase):
    pass


class Profile(_ProfileBase):
    first_name: str
    last_name: str
    email: str | None
    id: str

    class Config:
        orm_mode = True
