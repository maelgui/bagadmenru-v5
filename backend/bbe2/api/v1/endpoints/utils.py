from fastapi import APIRouter, Depends, HTTPException
from imapclient.exceptions import IMAPClientError  # type: ignore

from bbe2.dependencies import SettingsDep
from bbe2.services.email import InboxEmail, fetch_inbox_emails
from bbe2.utils.auth import Action, Authorization, Resource

router = APIRouter(prefix="/utils")


@router.get(
    "/emails",
    response_model=list[InboxEmail],
    response_model_by_alias=True,
    dependencies=[Depends(Authorization(Action.VIEW, Resource.EMAIL))],
)
def get_emails(
    settings: SettingsDep,
) -> list[InboxEmail]:
    try:
        emails = fetch_inbox_emails(settings)
    except IMAPClientError as exc:
        raise HTTPException(
            status_code=501, detail="Failed to connect to mailbox"
        ) from exc
    return emails
