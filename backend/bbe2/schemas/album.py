import datetime

from pydantic import BaseModel, ConfigDict


class _AlbumBase(BaseModel):
    title: str
    date: datetime.date


class AlbumCreate(_AlbumBase):
    pass


class Album(_AlbumBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
