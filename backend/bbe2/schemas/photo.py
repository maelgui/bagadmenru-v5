from datetime import datetime

from pydantic import BaseModel


class _PhotoBase(BaseModel):
    url: str

class PhotoCreate(_PhotoBase):
    pass

class Photo(_PhotoBase):

    class Config:
        orm_mode = True
