"""Browser-side audit events (page views, clicks) reported by the frontend."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from bbe2 import schemas
from bbe2.dependencies import SessionDep
from bbe2.schemas.auth import JwtPayload
from bbe2.services import audit as audit_service
from bbe2.utils.auth import Authorization
from bbe2.utils.permissions import Action, Resource

router = APIRouter(prefix="/audit")


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
async def ingest_client_events(
    batch: schemas.ClientAuditBatch,
    request: Request,
    session: SessionDep,
    payload: Annotated[JwtPayload, Depends(Authorization(Action.VIEW, Resource.ME))],
) -> None:
    """Store a batch of events for the authenticated member.

    The actor is the session, never the body: a client cannot file events
    under another member. IP and user agent are taken from the request.
    """
    audit_service.ingest_client_events(
        session,
        user_id=payload.sub,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        events=batch.events,
    )
