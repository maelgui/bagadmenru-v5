import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, computed_field

from bbe2.utils.s3 import s3


class _ProfileBase(BaseModel):
    first_name: str
    last_name: str
    picture_key: str | None
    instrument_id: int | None


class ProfileCreate(_ProfileBase):
    email: str

    pass


class ProfileUpdate(_ProfileBase):
    pass

class Permission(BaseModel):
    id: str
    tag: str
    name: str
    description: str

class Group(BaseModel):
    id: int
    name: str
    permissions: list[Permission]
    color: str = "#932a58"


class Profile(_ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    email: str
    id: str

    groups: list[Group] = []

    instrument: Optional[Group] = None

    @computed_field
    @property
    def picture_url(self) -> Optional[str]:
        if not self.picture_key:
            return None
        return s3.generate_get_presigned_url(object_name=self.picture_key)


class Invitation(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
