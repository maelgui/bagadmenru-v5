from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.schemas.helloasso import MembershipStatus
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
    receives_push: bool


class MyProfileUpdate(_ProfileBase):
    pass


class ProfileCreate(_ProfileBase):
    # Defaults mirror the DB column defaults (UserDB) so a creation payload
    # that omits the notification switches still succeeds instead of 422-ing.
    # They live here (not on _ProfileBase) on purpose: update payloads must
    # keep the fields required, so a partial PUT can never silently flip an
    # existing member's preference back to True.
    receives_emails: bool = True
    receives_push: bool = True

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

    # Membership status for the current season. Only populated on the member
    # list for callers holding ``view:membership`` (staff/admin); it stays
    # ``None`` for everyone else so this endpoint never leaks other members'
    # adhesion status to unauthorized users. Computed, not stored on UserDB.
    membership_status: Optional[MembershipStatus] = None

    # Season label of the member's active membership, e.g. "2026-2027". Set
    # only when ``membership_status`` is populated and the member is active;
    # lets the UI show which season an "up to date" member has paid for.
    membership_active_season: Optional[str] = None

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
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_instrument: bool = False


class PublicInstrument(BaseModel):
    """Instrument as exposed on the *public* ``/instruments`` endpoint.

    Deliberately a standalone schema (not derived from ``_GroupBase`` /
    ``MinimalGroup``) so that adding a field to a shared group schema can never
    silently widen this unauthenticated surface. Keep it to non-sensitive
    display data only; ``tests/api/v1/test_instruments.py`` freezes the exact
    field set.
    """

    id: int
    name: str
    color: str


class GroupCreate(_GroupBase):
    mailing_list: Optional[str]
    role_ids: list[str]
    is_instrument: bool = False


class GroupUpdate(_GroupBase):
    mailing_list: Optional[str]
    role_ids: list[str]
    is_instrument: bool = False


class Group(MinimalGroup):
    mailing_list: Optional[str]
    roles: list[Role]
    members: list[Profile]
