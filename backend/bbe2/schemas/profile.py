from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.utils.s3 import (
    AVATAR_URL_EXPIRATION_SECONDS,
    ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
    S3Helper,
)


class _ProfileBase(BaseModel):
    first_name: str
    last_name: str
    picture_key: str | None = None
    receives_emails: bool


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
    # s3_helper must be set in S3Helper and S3HelperDependencies must be used in route
    s3_helper: ClassVar[S3Helper]

    email: str
    id: str

    groups: list["MinimalGroup"]

    instrument: Optional["MinimalGroup"] = None

    is_active: bool

    @computed_field  # type: ignore[misc]
    @property
    def picture_url(self) -> Optional[str]:
        if not self.picture_key:
            return None
        return self.s3_helper.generate_get_presigned_url(
            object_name=self.picture_key,
            cache_control=ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
            expiration=AVATAR_URL_EXPIRATION_SECONDS,
            stable=True,
        )


class Role(BaseModel):
    id: str
    description: str


class _GroupBase(BaseModel):
    name: str
    color: str = "#932a58"


class MinimalGroup(_GroupBase):
    id: int
    is_instrument: bool = False


class GroupCreate(_GroupBase):
    mailing_list: Optional[str]
    role_ids: list[str]


class GroupUpdate(_GroupBase):
    mailing_list: Optional[str]
    role_ids: list[str]


class Group(MinimalGroup):
    mailing_list: Optional[str]
    roles: list[Role]
    members: list[Profile]
