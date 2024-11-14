import httpx
from fastapi import APIRouter, Security

from bbe2.dependencies import SettingsDep
from bbe2.utils.auth import get_current_user
from bbe2.utils.scopes import UtilsScopes

router = APIRouter(prefix="/utils")


@router.get("/emails", response_model=list[dict])
def get_emails(
    settings: SettingsDep,
    token: str = Security(get_current_user, scopes=[str(UtilsScopes.VIEW_EMAILS)]),
):
    res = httpx.get(f"{settings.email_api_endpoint}/mailbox/emails", timeout=10)
    res.raise_for_status()
    return res.json()
