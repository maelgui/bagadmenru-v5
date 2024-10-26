"""Authentication fastapi dependencies."""

import logging
import os
from typing import Annotated

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer, SecurityScopes
from requests.auth import HTTPBasicAuth

from bbe2 import models
from bbe2.config import Settings, get_settings
from bbe2.crud import CRUDProfile

OAUTH_ISSUER = os.environ.get("OAUTH_ISSUER", "").lstrip("/")
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=f"{OAUTH_ISSUER}/auth",
    tokenUrl=f"{OAUTH_ISSUER}/token",
)


async def get_current_user(
    security_scopes: SecurityScopes,
    token: Annotated[str, Depends(oauth2_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
    profile_crud: Annotated[CRUDProfile, Depends()],
):
    """Checks oauth access token, checks scope, and return token content.

    Args:
        security_scopes (SecurityScopes): Required security scopes
        token (str, optional): OAuth access token. Defaults to Depends(oauth2_scheme).

    Raises:
        HTTPException: 401 when token invalid, 403 when scope missing

    Returns:
        dict[str, Any]: access token content
    """

    res = requests.post(
        f"{settings.oidc_issuer}/token/introspection",
        data={"token": token},
        auth=HTTPBasicAuth("bbe2-back", "aaaa"),
        timeout=2,
    ).json()

    if not res["active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    db_profile = profile_crud.find_one_by(models.Profile.id == res["sub"])

    if db_profile:
        permissions = [p.id for g in db_profile.groups for p in g.permissions]
    else:
        permissions = []

    for permission in security_scopes.scopes:
        if permission not in permissions:
            logging.warning("Unauthorized access: missing role %s", permission)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    return res["sub"]
