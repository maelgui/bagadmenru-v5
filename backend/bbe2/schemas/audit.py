"""Pydantic schemas for the audit trail (who did what, when)."""

import json
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import AwareDatetime, BaseModel, Field, field_validator


class AuditKind(str, Enum):
    # One row per HTTP request handled by the API. A mutation is simply an
    # API_CALL whose method is not GET; it is not a separate kind.
    API_CALL = "API_CALL"
    # Reported by the frontend: a route rendered in the browser.
    PAGE_VIEW = "PAGE_VIEW"
    # Reported by the frontend: an interactive element activated.
    CLICK = "CLICK"


# Kinds the browser may report. API_CALL rows are only ever written by the
# server middleware, so a client claiming one is rejected.
CLIENT_KINDS = frozenset({AuditKind.PAGE_VIEW, AuditKind.CLICK})

MAX_NAME_LENGTH = 200
MAX_PATH_LENGTH = 2000
MAX_DETAILS_JSON_LENGTH = 2000
MAX_BATCH_SIZE = 200


class ClientAuditEvent(BaseModel):
    """One browser-side event as reported by the frontend tracker."""

    kind: AuditKind
    # Low-cardinality label: the route pattern (``/profile/:profileId``) for a
    # page view, the accessible name / ``data-audit`` id for a click.
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    # The concrete location the event happened on.
    path: str = Field(min_length=1, max_length=MAX_PATH_LENGTH)
    # Browser clock at the time of the event; batches are flushed late, so the
    # server receipt time would smear a burst of clicks onto one instant.
    at: AwareDatetime
    details: Optional[dict[str, Any]] = None

    @field_validator("kind")
    @classmethod
    def _client_kind_only(cls, value: AuditKind) -> AuditKind:
        if value not in CLIENT_KINDS:
            raise ValueError("clients may only report PAGE_VIEW and CLICK events")
        return value

    @field_validator("details")
    @classmethod
    def _bounded_details(
        cls, value: Optional[dict[str, Any]]
    ) -> Optional[dict[str, Any]]:
        if value is not None and len(json.dumps(value)) > MAX_DETAILS_JSON_LENGTH:
            raise ValueError("details too large")
        return value


class ClientAuditBatch(BaseModel):
    events: list[ClientAuditEvent] = Field(min_length=1, max_length=MAX_BATCH_SIZE)


class AuditActor(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str


class AuditEvent(BaseModel):
    id: int
    at: datetime
    kind: AuditKind
    name: str
    path: str
    # API_CALL only.
    method: Optional[str] = None
    status: Optional[int] = None
    duration_ms: Optional[float] = None
    correlation_id: Optional[str] = None
    # None for an anonymous request (failed login, deleted account, ...).
    actor: Optional[AuditActor] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[dict[str, Any]] = None


class AuditEventPage(BaseModel):
    items: list[AuditEvent]
    # Pass back as ``before`` to fetch the next (older) page; None at the end.
    next_cursor: Optional[int] = None
