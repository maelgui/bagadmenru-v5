import uuid
from typing import Optional

from bbe2.config import get_settings
from bbe2.utils.s3 import S3Helper
from pydantic import BaseModel, ConfigDict, EmailStr, computed_field


class _ProfileBase(BaseModel):
    first_name: str
    last_name: str
    picture_key: str | None = None


class MyProfileUpdate(_ProfileBase):
    pass


class ProfileCreate(_ProfileBase):
    instrument_id: int
    group_ids: list[int]
    email: str


class ProfileUpdate(_ProfileBase):
    instrument_id: int
    group_ids: list[int]


class Profile(_ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    # email: str
    id: str

    groups: list["MinimalGroup"]

    instrument: Optional["MinimalGroup"] = None

    @computed_field
    @property
    def picture_url(self) -> Optional[str]:
        s3 = S3Helper(get_settings())
        if not self.picture_key:
            return None
        return s3.generate_get_presigned_url(object_name=self.picture_key)


class Permission(BaseModel):
    id: str
    tag: str
    name: str
    description: str


class _GroupBase(BaseModel):
    name: str
    color: str = "#932a58"


class MinimalGroup(_GroupBase):
    id: int


class GroupCreate(_GroupBase):
    permission_ids: list[str]


class GroupUpdate(_GroupBase):
    permission_ids: list[str]


class Group(MinimalGroup):
    permissions: list[Permission]
    members: list[Profile]
