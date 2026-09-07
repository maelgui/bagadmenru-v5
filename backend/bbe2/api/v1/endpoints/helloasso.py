"""HelloAsso integration endpoints: webhook ingestion + admin reconciliation."""

import hashlib
import hmac
import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select

from bbe2 import models, schemas
from bbe2.dependencies import SessionDep, SettingsDep
from bbe2.services import membership as membership_service
from bbe2.utils.auth import Action, Authorization, Resource

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/helloasso")


def _verify_authenticity(
    settings,
    raw_body: bytes,
    signature: str | None,
    token: str | None,
) -> bool:
    """Verify a HelloAsso notification is genuine.

    Accepts the request if either:
      * an HMAC-SHA256 signature key is configured and the ``x-ha-signature``
        header matches the HMAC of the raw body (partner mode), or
      * a shared webhook token is configured and matches the ``token`` query
        parameter (association mode).

    Fails closed: if neither mechanism is configured, no request is accepted.
    """
    if settings.helloasso_signature_key and signature:
        # HelloAsso signs the raw request body with HMAC-SHA256 keyed on the
        # partner signatureKey and sends the result as a lowercase hex digest in
        # the ``x-ha-signature`` header. ``.hexdigest()`` is already lowercase;
        # ``signature.lower()`` guards against a differently-cased header.
        expected = hmac.new(
            settings.helloasso_signature_key.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(expected, signature.lower()):
            return True

    if settings.helloasso_webhook_token and token:
        if hmac.compare_digest(settings.helloasso_webhook_token, token):
            return True

    return False


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def helloasso_webhook(
    request: Request,
    session: SessionDep,
    settings: SettingsDep,
    x_ha_signature: Annotated[str | None, Header()] = None,
    token: str | None = None,
):
    """Receive a HelloAsso notification and persist membership items.

    Always returns 200 for authentic, well-formed notifications (even when
    there is nothing to store), because any non-200 makes HelloAsso retry the
    delivery for up to 27 hours.
    """
    raw_body = await request.body()

    if not _verify_authenticity(settings, raw_body, x_ha_signature, token):
        logger.warning("Rejected HelloAsso webhook: authenticity check failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    try:
        payload = await request.json()
    except ValueError as exc:
        # Malformed JSON is a client error; retrying won't help, so 400.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body",
        ) from exc

    try:
        notification = schemas.HelloAssoNotification.model_validate(payload)
    except ValueError:
        # Unknown event shape: acknowledge so HelloAsso stops retrying, but
        # record it for debugging.
        logger.info("Ignoring unrecognized HelloAsso notification: %s", payload)
        return {"status": "ignored"}

    processed = membership_service.ingest_notification(session, notification, payload)
    logger.info(
        "Processed HelloAsso %s notification: %d membership item(s)",
        notification.event_type,
        processed,
    )
    return {"status": "ok", "memberships_processed": processed}


@router.get(
    "/orders/unlinked",
    response_model=List[schemas.UnlinkedMembership],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.MEMBERSHIP))],
)
async def list_unlinked_memberships(session: SessionDep):
    """List membership rows not yet attached to a member (admin reconciliation)."""
    rows = session.scalars(
        select(models.HelloAssoMembershipDB)
        .where(models.HelloAssoMembershipDB.user_id.is_(None))
        .order_by(models.HelloAssoMembershipDB.order_date.desc())
    ).all()
    return rows


@router.post(
    "/orders/{membership_id}/link",
    response_model=schemas.UnlinkedMembership,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.MEMBERSHIP))],
)
async def link_membership(
    membership_id: str,
    body: schemas.MembershipLinkRequest,
    session: SessionDep,
):
    """Attach an unlinked membership row to a member."""
    row = session.get(models.HelloAssoMembershipDB, membership_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found"
        )

    member = session.get(models.UserDB, body.user_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )

    row.user_id = body.user_id
    session.commit()
    session.refresh(row)
    return row


@router.delete(
    "/orders/{membership_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(Authorization(Action.EDIT, Resource.MEMBERSHIP))],
)
async def delete_membership(
    membership_id: str,
    session: SessionDep,
):
    """Delete a membership record (e.g. a duplicate or erroneous order)."""
    row = session.get(models.HelloAssoMembershipDB, membership_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found"
        )
    session.delete(row)
    session.commit()
