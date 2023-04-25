
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class FileType(Enum):
    DIRECTORY = 'DIR'
    FILE = 'FILE'


class _FileBase(BaseModel):
    type: FileType
    name: str

class FileCreate(_FileBase):
    url: Optional[str] = None

class FileUpdate(BaseModel):
    name: Optional[str] = None

class File(FileCreate):
    id: int
    is_root: bool

    class Config:
        orm_mode = True
