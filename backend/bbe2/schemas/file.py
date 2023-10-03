from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict


class FileOrFolderType(Enum):
    DIRECTORY = "DIR"
    FILE = "FILE"


class _FileOrFolderBase(BaseModel):
    name: str


class FolderCreate(_FileOrFolderBase):
    pass


class FileOrFolderUpdate(_FileOrFolderBase):
    name: Optional[str] = None
    parent_id: Optional[int] = None


class FileOrFolder(_FileOrFolderBase):
    model_config = ConfigDict(from_attributes=True)

    type: FileOrFolderType
    id: int
    parent_id: Optional[int] = None
    url: Optional[str] = None
