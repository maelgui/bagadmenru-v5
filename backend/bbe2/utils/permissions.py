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
    # Calendar subscription feed (ICS). Deliberately a separate, finer resource
    # than EVENT so an API key can be scoped to *only* the calendar feed without
    # also granting the broader event-listing endpoints. Granted to the same
    # roles as viewing events (every member who can see events can subscribe).
    CALENDAR = "calendar"
    RESPONSE = "response"

    FILE = "file"

    PROFILE = "profile"
    GROUP = "group"
    EMAIL = "email"
    # Member-to-member onboarding: holders may generate self-service signup
    # invitations (link/QR or backend-sent email). Deliberately granted broadly
    # (parrainage) since invited accounts are created with default groups only,
    # i.e. no privileged roles.
    INVITATION = "invitation"
    # Membership status/history sourced from HelloAsso. Members can always see
    # their own status (guarded by Resource.ME), so this resource governs
    # seeing *other* members' status and reconciling unlinked HelloAsso orders.
    MEMBERSHIP = "membership"


# Role → set of (action, resource) tuples
ROLE_PERMISSIONS: dict[str, set[tuple[str, str]]] = {
    "eleves": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.EVENT.value),
        (Action.VIEW.value, Resource.CALENDAR.value),
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
        (Action.VIEW.value, Resource.CALENDAR.value),
        (Action.VIEW.value, Resource.RESPONSE.value),
        (Action.CREATE.value, Resource.RESPONSE.value),
        (Action.VIEW.value, Resource.PROFILE.value),
        (Action.VIEW.value, Resource.FILE.value),
        (Action.VIEW.value, Resource.GROUP.value),
        (Action.CREATE.value, Resource.INVITATION.value),
    },
    "staff": {
        (Action.VIEW.value, Resource.ME.value),
        (Action.EDIT.value, Resource.ME.value),
        (Action.VIEW.value, Resource.EVENT.value),
        (Action.VIEW.value, Resource.CALENDAR.value),
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
        (Action.CREATE.value, Resource.INVITATION.value),
        (Action.VIEW.value, Resource.MEMBERSHIP.value),
        (Action.EDIT.value, Resource.MEMBERSHIP.value),
    },
}


def permission_string(action: Action, resource: Resource) -> str:
    """Format an (action, resource) pair as the 'action:resource' string.

    Single source of truth for the permission wire format, matching the strings
    produced by :func:`get_permissions_for_roles` and stored in an API key's
    ``authorized_permissions``.
    """
    return f"{action.value}:{resource.value}"


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
