from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field, model_validator


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


class FileOrFolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> "FileOrFolderUpdate":
        if self.name is None and self.parent_id is None:
            raise ValueError("name or parent_id is required")
        return self


class FileVersion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: int
    size: Optional[int] = None
    uploaded_at: datetime
    uploader: Optional[FileAuthor] = None
    superseded_at: Optional[datetime] = None
    purged_at: Optional[datetime] = None


class FileOrFolder(_FileOrFolderBase):
    model_config = ConfigDict(from_attributes=True)

    type: FileOrFolderType
    id: int
    parent_id: Optional[int] = None
    current_version: Optional[FileVersion] = None
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


class FileAccessAction(Enum):
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"


class SuggestionReason(Enum):
    GROUP = "GROUP"
    TRENDING = "TRENDING"
    RECENT = "RECENT"


class Suggestion(BaseModel):
    file: FileOrFolder
    reason: SuggestionReason
    group_name: Optional[str] = None
