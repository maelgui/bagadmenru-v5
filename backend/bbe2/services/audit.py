"""Audit trail service: the single writer, reader and janitor of ``audit_events``.

Writers:

* :func:`record_api_call` -- called by the HTTP middleware in ``main.py`` for
  every API request. It never raises into the request path: a failed audit
  write is logged and dropped, never turned into a 500.
* :func:`ingest_client_events` -- the ``POST /audit/events`` endpoint hands it
  the browser-reported page views and clicks. The server stamps the actor
  (from the authenticated session), IP and user agent; the client cannot
  attribute an event to someone else.

Reader: :func:`list_audit_events` (admin screen, cursor-paginated newest
first). Janitor: :func:`purge_audit_events` (daily job, two retention windows).
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Optional

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import selectinload

from bbe2.models.audit_event import AuditEventDB
from bbe2.schemas.audit import (
    AuditActor,
    AuditEvent,
    AuditEventPage,
    AuditKind,
    ClientAuditEvent,
)
from bbe2.utils import get_logger

logger = get_logger()

# Path parameters whose VALUE is a credential (email-link tokens, recovery
# grants, API keys). They are replaced in the stored concrete path so the audit
# table never becomes a place to harvest live secrets from.
_SECRET_PARAM_RE = re.compile(r"token|code|secret|key|grant", re.IGNORECASE)
REDACTED = "<redacted>"

# Requests that are infrastructure noise rather than user actions.
_UNAUDITED_PATHS = frozenset({"/api/v1/health", "/api/v1/version"})
# The frontend reporting its own events must not itself show up as an API call,
# or every page view would come with a second row.
INGEST_ROUTE = "/api/v1/audit/events"

MAX_USER_AGENT = 512
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def is_audited_request(method: str, path: str) -> bool:
    """Whether the middleware should write an API_CALL row for this request."""
    if method == "OPTIONS" or not path.startswith("/api/"):
        return False
    return path not in _UNAUDITED_PATHS and path != INGEST_ROUTE


def _is_secret_param(name: str) -> bool:
    return _SECRET_PARAM_RE.search(name) is not None


def redact_path(path: str, path_params: Mapping[str, Any]) -> str:
    """Return ``path`` with secret-looking path parameter values masked."""
    for name, value in path_params.items():
        if _is_secret_param(name) and value:
            path = path.replace(str(value), REDACTED)
    return path


def redact_params(path_params: Mapping[str, Any]) -> dict[str, Any]:
    """Return ``path_params`` with secret-looking values masked."""
    return {
        name: REDACTED if _is_secret_param(name) and value else value
        for name, value in path_params.items()
    }


# A browser clock is the client's word. Its timestamp is kept only when it is
# plausible against the server's receipt time; otherwise the receipt time
# stands, so a member cannot backdate or postdate their own journal.
CLIENT_CLOCK_PAST_TOLERANCE = timedelta(minutes=10)
CLIENT_CLOCK_FUTURE_TOLERANCE = timedelta(minutes=1)


def trusted_at(client_at: datetime, received_at: datetime) -> datetime:
    """The timestamp to store for a client-reported event."""
    if (
        received_at - CLIENT_CLOCK_PAST_TOLERANCE
        <= client_at
        <= received_at + CLIENT_CLOCK_FUTURE_TOLERANCE
    ):
        return client_at
    return received_at


def route_pattern(path: str, path_params: Mapping[str, Any]) -> str:
    """Rebuild the route template from a concrete path and its parameters.

    ``/api/v1/events/42`` with ``{"event_id": "42"}`` gives
    ``/api/v1/events/{event_id}``. Segments are compared whole, so a value
    that also appears inside another segment (``1`` in ``v1``) is left alone.
    Derived here rather than read from the matched route object because
    FastAPI nests included routers, whose route objects only know their own
    suffix of the path.
    """
    by_value = {str(value): name for name, value in path_params.items()}
    return "/".join(
        f"{{{by_value[segment]}}}" if segment in by_value else segment
        for segment in path.split("/")
    )


def _clip_user_agent(user_agent: Optional[str]) -> Optional[str]:
    return user_agent[:MAX_USER_AGENT] if user_agent else None


def record_api_call(  # pylint: disable=too-many-arguments
    session: DbSession,
    *,
    user_id: Optional[str],
    method: str,
    matched: bool,
    path: str,
    path_params: Mapping[str, Any],
    status: int,
    duration_ms: float,
    correlation_id: Optional[str],
    ip: Optional[str],
    user_agent: Optional[str],
) -> None:
    """Add one API_CALL row (the caller commits).

    ``name`` is the route template (``GET /api/v1/events/{event_id}``). A
    request no route owns (``matched`` False: a 404 on an unknown path) is
    stored under a fixed label so probing noise does not create one distinct
    name per URL; its concrete path is still kept.
    """
    pattern = route_pattern(path, path_params) if matched else "<unmatched>"
    session.add(
        AuditEventDB(
            user_id=user_id,
            kind=AuditKind.API_CALL,
            name=f"{method} {pattern}",
            path=redact_path(path, path_params),
            method=method,
            status=status,
            duration_ms=duration_ms,
            correlation_id=correlation_id,
            ip=ip,
            user_agent=_clip_user_agent(user_agent),
            details=redact_params(path_params) if path_params else None,
        )
    )


def ingest_client_events(
    session: DbSession,
    *,
    user_id: str,
    ip: Optional[str],
    user_agent: Optional[str],
    events: list[ClientAuditEvent],
    received_at: Optional[datetime] = None,
) -> int:
    """Store browser-reported events for ``user_id``; returns how many."""
    now = received_at or datetime.now(tz=timezone.utc)
    session.add_all(
        AuditEventDB(
            at=trusted_at(event.at, now),
            user_id=user_id,
            kind=event.kind,
            name=event.name,
            path=event.path,
            ip=ip,
            user_agent=_clip_user_agent(user_agent),
            details=event.details,
        )
        for event in events
    )
    return len(events)


def _to_schema(row: AuditEventDB) -> AuditEvent:
    actor = (
        AuditActor(
            id=row.user.id,
            first_name=row.user.first_name,
            last_name=row.user.last_name,
            email=row.user.email,
        )
        if row.user is not None
        else None
    )
    return AuditEvent(
        id=row.id,
        at=row.at,
        kind=row.kind,
        name=row.name,
        path=row.path,
        method=row.method,
        status=row.status,
        duration_ms=row.duration_ms,
        correlation_id=row.correlation_id,
        actor=actor,
        ip=row.ip,
        user_agent=row.user_agent,
        details=row.details,
    )


def list_audit_events(  # pylint: disable=too-many-arguments
    session: DbSession,
    *,
    user_id: Optional[str] = None,
    kind: Optional[AuditKind] = None,
    mutations_only: bool = False,
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
    q: Optional[str] = None,
    before: Optional[int] = None,
    limit: int = DEFAULT_PAGE_SIZE,
) -> AuditEventPage:
    """Newest-first page of events. ``before`` is the previous page's cursor.

    ``mutations_only`` keeps API calls whose method is not GET (and drops the
    browser-side kinds, which have no method). ``q`` matches ``name`` or
    ``path``, case-insensitively.
    """
    limit = max(1, min(limit, MAX_PAGE_SIZE))
    query = (
        select(AuditEventDB)
        .options(selectinload(AuditEventDB.user))
        .order_by(AuditEventDB.id.desc())
        .limit(limit + 1)
    )
    if user_id is not None:
        query = query.where(AuditEventDB.user_id == user_id)
    if kind is not None:
        query = query.where(AuditEventDB.kind == kind)
    if mutations_only:
        query = query.where(
            AuditEventDB.method.is_not(None), AuditEventDB.method != "GET"
        )
    if since is not None:
        query = query.where(AuditEventDB.at >= since)
    if until is not None:
        query = query.where(AuditEventDB.at < until)
    if q:
        pattern = f"%{q}%"
        query = query.where(
            or_(AuditEventDB.name.ilike(pattern), AuditEventDB.path.ilike(pattern))
        )
    if before is not None:
        query = query.where(AuditEventDB.id < before)

    rows = list(session.scalars(query).all())
    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = rows[-1].id
    return AuditEventPage(items=[_to_schema(r) for r in rows], next_cursor=next_cursor)


def purge_audit_events(
    session: DbSession, *, client_retention_days: int, api_retention_days: int
) -> int:
    """Delete rows past their retention window; returns the number deleted.

    Browser-side kinds (page views, clicks) and API calls have separate
    windows. A window of 0 disables the purge for that family.
    """
    now = datetime.now(tz=timezone.utc)
    deleted = 0
    for kinds, days in (
        ((AuditKind.PAGE_VIEW, AuditKind.CLICK), client_retention_days),
        ((AuditKind.API_CALL,), api_retention_days),
    ):
        if days <= 0:
            continue
        result = session.execute(
            delete(AuditEventDB).where(
                AuditEventDB.kind.in_(kinds),
                AuditEventDB.at < now - timedelta(days=days),
            )
        )
        # A Core DELETE returns a CursorResult exposing rowcount; mypy only sees
        # the base Result, so read it the way the other purges do.
        deleted += getattr(result, "rowcount", 0) or 0
    return deleted
