from enum import Enum


class AlbumScopes(Enum):
    """Photo gallery related scopes."""

    VIEW = "view_album"
    CREATE = "create_album"
    DELETE = "delete_album"
    UPDATE = "update_album"


class EventScopes(Enum):
    """Events related scopes."""

    VIEW = "events:view"
    CREATE = "events:create"
    DELETE = "events:delete"
    UPDATE = "events:edit"
    REPLY = "answers:manage-own"


class FileScopes(Enum):
    """Filesystem related scopes."""

    VIEW = "files:view"
    CREATE = "files:create"
    DELETE = "files:delete"
    UPDATE = "files:edit"


class ProfilesScopes(Enum):
    """Profile managment related scopes."""

    VIEW = "profiles:view"
    UPDATE = "profiles:edit"
