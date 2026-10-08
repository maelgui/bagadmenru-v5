from datetime import datetime
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
    CONTAINER = "CONTAINER"


class _FileOrFolderBase(BaseModel):
    name: str


class FileAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str

    @computed_field  # type: ignore[misc]
    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}"


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
    source_format: Optional[str] = None
    processing_status: Optional[str] = None
    processing_failure_reason: Optional[str] = None
    # Number of direct children. Populated only when listing a folder's
    # children; None elsewhere (e.g. single-item lookups).
    child_count: Optional[int] = None
    uploaded_at: Optional[datetime] = None
    uploader: Optional[FileAuthor] = None
    modified_at: Optional[datetime] = None
    modifier: Optional[FileAuthor] = None
    size: Optional[int] = None

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
