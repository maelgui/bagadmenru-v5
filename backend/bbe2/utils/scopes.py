from enum import Enum


class AlbumScopes(Enum):
    VIEW = "view_album"
    CREATE = "create_album"
    DELETE = "delete_album"
    UPDATE = "update_album"


class EventScopes(Enum):
    VIEW = "events:view"
    CREATE = "events:create"
    DELETE = "events:delete"
    UPDATE = "events:edit"
    REPLY = "answers:manage-own"


class FileScopes(Enum):
    VIEW = "files:view"
    CREATE = "files:create"
    DELETE = "files:delete"
    UPDATE = "files:edit"


class ProfilesScopes(Enum):
    VIEW = "profiles:view"
    UPDATE = "profiles:edit"
