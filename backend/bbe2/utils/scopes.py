from enum import Enum


class PermissionBase(Enum):
    pass


class AlbumScopes(PermissionBase):
    """Photo gallery related scopes."""

    VIEW = "view_album"
    CREATE = "create_album"
    DELETE = "delete_album"
    UPDATE = "update_album"


class EventScopes(PermissionBase):
    """Events related scopes."""

    VIEW = "events:view"
    CREATE = "events:create"
    DELETE = "events:delete"
    UPDATE = "events:edit"
    ANSWER = "answers:manage-own"


class FileScopes(PermissionBase):
    """Filesystem related scopes."""

    VIEW = "files:view"
    CREATE = "files:create"
    DELETE = "files:delete"
    UPDATE = "files:edit"


class ProfilesScopes(PermissionBase):
    """Profile managment related scopes."""

    VIEW = "profiles:view"
    CREATE = "profiles:create"
    UPDATE = "profiles:edit"


class GroupScopes(PermissionBase):
    """Groups related permissions"""

    VIEW = "group:view"
    CREATE = "group.create"
    UPDATE = "group.update"

class UtilsScopes(PermissionBase):
    """Groups related permissions"""

    VIEW_EMAILS = "emails:view"
