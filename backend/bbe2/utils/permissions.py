"""Role-based access control (RBAC) permissions.

This replaces the OPA authorizer service with a simple in-process check.
Single source of truth for all permission rules.
"""

from enum import Enum


class Action(Enum):
    VIEW = "view"
    EDIT = "edit"
    CREATE = "create"
    DELETE = "delete"


class Resource(Enum):
    ME = "me"

    EVENT = "event"
    RESPONSE = "response"

    FILE = "file"

    PROFILE = "profile"
    GROUP = "group"
    EMAIL = "email"


# Role → set of (action, resource) tuples
ROLE_PERMISSIONS: dict[str, set[tuple[str, str]]] = {
    "eleves": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.EVENT.value),
        (Action.VIEW.value, Resource.PROFILE.value),
        (Action.VIEW.value, Resource.FILE.value),
        (Action.VIEW.value, Resource.GROUP.value),
    },
    "intervenants": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.FILE.value),
    },
    "bagad": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.EVENT.value),
        (Action.VIEW.value, Resource.RESPONSE.value),
        (Action.CREATE.value, Resource.RESPONSE.value),
        (Action.VIEW.value, Resource.PROFILE.value),
        (Action.VIEW.value, Resource.FILE.value),
        (Action.VIEW.value, Resource.GROUP.value),
    },
    "staff": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.EVENT.value),
        (Action.CREATE.value, Resource.EVENT.value),
        (Action.EDIT.value, Resource.EVENT.value),
        (Action.DELETE.value, Resource.EVENT.value),
        (Action.VIEW.value, Resource.RESPONSE.value),
        (Action.CREATE.value, Resource.RESPONSE.value),
        (Action.VIEW.value, Resource.PROFILE.value),
        (Action.CREATE.value, Resource.PROFILE.value),
        (Action.EDIT.value, Resource.PROFILE.value),
        (Action.VIEW.value, Resource.FILE.value),
        (Action.CREATE.value, Resource.FILE.value),
        (Action.EDIT.value, Resource.FILE.value),
        (Action.DELETE.value, Resource.FILE.value),
        (Action.VIEW.value, Resource.GROUP.value),
        (Action.CREATE.value, Resource.GROUP.value),
        (Action.EDIT.value, Resource.GROUP.value),
        (Action.DELETE.value, Resource.GROUP.value),
        (Action.VIEW.value, Resource.EMAIL.value),
    },
}


def is_allowed(roles: list[str], action: Action, resource: Resource) -> bool:
    """Check if any of the user's roles grant the given action on the resource."""
    if "admin" in roles:
        return True
    return any(
        (action.value, resource.value) in ROLE_PERMISSIONS.get(role, set())
        for role in roles
    )


def get_permissions_for_roles(roles: list[str]) -> list[str]:
    """Return all permissions for the given roles as 'action:resource' strings."""
    if "admin" in roles:
        return [
            f"{action.value}:{resource.value}"
            for action in Action
            for resource in Resource
        ]

    permissions: set[str] = set()
    for role in roles:
        for action, resource in ROLE_PERMISSIONS.get(role, set()):
            permissions.add(f"{action}:{resource}")
    return sorted(permissions)
