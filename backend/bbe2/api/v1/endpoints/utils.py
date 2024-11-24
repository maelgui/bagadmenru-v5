import httpx
from fastapi import APIRouter, Depends

from bbe2.dependencies import SettingsDep
from bbe2.utils.auth import Action, Authorization, Resource

router = APIRouter(prefix="/utils")


@router.get(
    "/emails",
    response_model=list[dict],
    dependencies=[Depends(Authorization(Action.VIEW, Resource.EMAIL))],
)
def get_emails(
    settings: SettingsDep,
):
    res = httpx.get(f"{settings.email_api_endpoint}/mailbox/emails", timeout=10)
    res.raise_for_status()
    return res.json()
