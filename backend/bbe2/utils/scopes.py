from enum import Enum


class AlbumScopes(Enum):
    VIEW = "view_album"
    CREATE = "create_album"
    DELETE = "delete_album"
    UPDATE = "update_album"

class EventScopes(Enum):
    VIEW = "view-events"
    CREATE = "create_event"
    DELETE = "delete_event"
    UPDATE = "update_event"
    REPLY = "reply_to_event"

class FileScopes(Enum):
    VIEW = "view_file"
    CREATE = "create_file"
    DELETE = "delete_file"
    UPDATE = "update_file"

class ProfilesScopes(Enum):
    VIEW = "view-profiles"
    UPDATE = "update_profile"
