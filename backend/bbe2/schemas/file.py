from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.utils.s3 import s3


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
    file_key: Optional[str] = None

    @computed_field
    @property
    def fileUrl(self) -> Optional[str]:
        if not self.file_key:
            return None
        return s3.generate_get_presigned_url(object_name=self.file_key)
