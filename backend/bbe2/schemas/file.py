from enum import Enum
from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict, computed_field

from bbe2.utils.s3 import (
    FILE_URL_EXPIRATION_SECONDS,
    ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
    S3Helper,
)


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
    # s3_helper must be set in S3Helper and S3HelperDependencies must be used in route
    s3_helper: ClassVar[S3Helper]

    type: FileOrFolderType
    id: int
    parent_id: Optional[int] = None
    file_key: Optional[str] = None
    # Number of direct children. Populated only when listing a folder's
    # children; None elsewhere (e.g. single-item lookups).
    child_count: Optional[int] = None

    @computed_field  # type: ignore[misc]
    @property
    def fileUrl(self) -> Optional[str]:
        if not self.file_key:
            return None
        return self.s3_helper.generate_get_presigned_url(
            object_name=self.file_key,
            filename=self.name,
            disposition="inline",
            cache_control=ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
            expiration=FILE_URL_EXPIRATION_SECONDS,
            stable=True,
        )

    @computed_field  # type: ignore[misc]
    @property
    def downloadUrl(self) -> Optional[str]:
        if not self.file_key:
            return None
        return self.s3_helper.generate_get_presigned_url(
            object_name=self.file_key,
            filename=self.name,
            disposition="attachment",
            cache_control=ONE_YEAR_IMMUTABLE_CACHE_CONTROL,
            expiration=FILE_URL_EXPIRATION_SECONDS,
            stable=True,
        )
