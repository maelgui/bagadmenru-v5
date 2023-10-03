from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.utils.s3 import s3


class Instrument(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str


class _ProfileBase(BaseModel):
    picture_key: str | None
    instrument_id: int | None


class ProfileCreate(_ProfileBase):
    pass


class ProfileUpdate(_ProfileBase):
    pass


class Profile(_ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    email: str
    id: str

    @computed_field
    @property
    def picture_url(self) -> str:
        if not self.picture_key:
            return None
        return s3.generate_get_presigned_url(object_name=self.picture_key)
