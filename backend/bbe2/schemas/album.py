import datetime

from pydantic import BaseModel


class _AlbumBase(BaseModel):
    title: str
    date: datetime.date

class AlbumCreate(_AlbumBase):
    pass

class Album(_AlbumBase):
    id: int

    class Config:
        orm_mode = True
