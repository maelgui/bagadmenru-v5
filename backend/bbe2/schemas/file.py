from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.config import get_settings
from bbe2.utils.s3 import S3Helper


class FileOrFolderType(Enum):
    DIRECTORY = "DIR"
    FILE = "FILE"


class _FileOrFolderBase(BaseModel):
    name: str


class FolderCreate(_FileOrFolderBase):
    pass


class FileOrFolderUpdate(_FileOrFolderBase):
    parent_id: int


class FileOrFolder(_FileOrFolderBase):
    model_config = ConfigDict(from_attributes=True)

    type: FileOrFolderType
    id: int
    parent_id: Optional[int] = None
    file_key: Optional[str] = None

    @computed_field  # type: ignore[misc]
    @property
    def fileUrl(self) -> Optional[str]:
        s3 = S3Helper(get_settings())
        if not self.file_key:
            return None
        return s3.generate_get_presigned_url(object_name=self.file_key)
