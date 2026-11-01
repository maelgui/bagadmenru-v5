from pydantic import BaseModel

from bbe2.schemas.event import Event
from bbe2.schemas.file import FileOrFolder
from bbe2.schemas.profile import Profile


class FileHit(BaseModel):
    file: FileOrFolder
    # Names of the ancestor folders, root excluded, outermost first.
    path: list[str]


class SearchResults(BaseModel):
    events: list[Event]
    profiles: list[Profile]
    files: list[FileHit]
