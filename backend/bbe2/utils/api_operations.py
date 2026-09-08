"""Registry of operations that an API key may be authorized to call.

An API key authenticates a member and carries a list of *authorized operations*
(OpenAPI operation ids). Rather than let a key target any of the app's
operations, we keep an explicit allowlist here: only these operations can be put
on a key. This keeps the API-key attack surface small and intentional -- adding
a new operation to the list is a deliberate decision, not an accident of adding
a route. The usual RBAC authorization still applies on top for every call.

Each entry maps a stable OpenAPI operation id (FastAPI ``APIRoute.unique_id``)
to a short human label shown in the key-management UI.
"""

from typing import Final

# Operation ids must match the route's *explicit* ``operation_id``. We set an
# explicit id (rather than relying on FastAPI's auto-generated ``unique_id``)
# because the auto id differs between the runtime route
# (``export_ics_me_events_...``) and the mounted OpenAPI schema
# (``..._api_v1_...``); an explicit id is stable and identical in both, and in
# the generated frontend client. ``ExportIcsMe`` is GET /api/v1/events/export/ics/me.
EXPORT_ICS_ME: Final = "ExportIcsMe"

# operation id -> human-friendly label (fr) for the UI.
API_KEY_OPERATIONS: Final[dict[str, str]] = {
    EXPORT_ICS_ME: "Exporter le calendrier (ICS)",
}


def is_allowed_operation(operation_id: str) -> bool:
    """Return whether ``operation_id`` may be placed on an API key."""
    return operation_id in API_KEY_OPERATIONS
