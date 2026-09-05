"""Correlation ID handling.

A correlation ID ties together an HTTP request, its response, any emails it
triggers, and log lines — useful for debugging, tracing, and letting E2E tests
(Playwright) locate the exact email produced by a given request.

The ID is stored in a ``ContextVar`` so it is reachable from anywhere in the
request's execution (including the email service) without threading it through
every function signature. For work that runs *outside* a request (e.g. FastAPI
``BackgroundTasks``), capture the ID during the request and re-set it at the
start of the background task via :func:`set_correlation_id`.

Security: an inbound client-supplied ID is only trusted if it matches a strict
format. Otherwise a fresh UUID is generated. This prevents log forgery and,
critically, CRLF/header injection when the value is later written into an
email header.
"""

import re
import uuid
from contextvars import ContextVar
from typing import Optional

# HTTP header name used on requests, responses, and outgoing emails.
CORRELATION_ID_HEADER = "X-Correlation-ID"

# Accept only a conservative, injection-safe charset. Covers UUIDs and typical
# trace IDs while forbidding CR/LF and control characters.
_VALID_CORRELATION_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

_correlation_id_ctx: ContextVar[Optional[str]] = ContextVar(
    "correlation_id", default=None
)


def is_valid_correlation_id(value: str) -> bool:
    """Return True if ``value`` is safe to trust and echo back."""
    return bool(_VALID_CORRELATION_ID.match(value))


def generate_correlation_id() -> str:
    """Generate a fresh server-side correlation ID."""
    return uuid.uuid4().hex


def resolve_correlation_id(incoming: Optional[str]) -> str:
    """Return a valid ID: reuse the incoming one if well-formed, else generate."""
    if incoming and is_valid_correlation_id(incoming):
        return incoming
    return generate_correlation_id()


def set_correlation_id(value: str) -> None:
    """Set the correlation ID for the current context."""
    _correlation_id_ctx.set(value)


def get_correlation_id() -> Optional[str]:
    """Return the correlation ID for the current context, if any."""
    return _correlation_id_ctx.get()
