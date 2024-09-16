from datetime import datetime

from pydantic import BaseModel, ConfigDict


class _PhotoBase(BaseModel):
    url: str


class PhotoCreate(_PhotoBase):
    pass


class Photo(_PhotoBase):
    model_config = ConfigDict(from_attributes=True)
