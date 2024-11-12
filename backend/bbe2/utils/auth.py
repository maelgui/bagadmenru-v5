"""Authentication fastapi dependencies."""

import logging
import os
from typing import Annotated

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer, SecurityScopes
from jwt import PyJWKClient, decode
from requests.auth import HTTPBasicAuth

from bbe2 import models
from bbe2.config import Settings, get_settings
from bbe2.crud import CRUDProfile

OAUTH_ISSUER = os.environ.get("OIDC_ISSUER", "").lstrip("/")
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=f"{OAUTH_ISSUER}/auth",
    tokenUrl=f"{OAUTH_ISSUER}/token",
)


def verify_jwt(token: str, oidc_issuer, oidc_audience):

    oidc_config = requests.get(f"{oidc_issuer}/.well-known/openid-configuration").json()
    signing_algos = oidc_config["id_token_signing_alg_values_supported"]

    # setup a PyJWKClient to get the appropriate signing key
    jwks_client = PyJWKClient(oidc_config["jwks_uri"])

    signing_key = jwks_client.get_signing_key_from_jwt(token)

    # now, decode_complete to get payload + header
    data = decode(
        token,
        key=signing_key.key,
        algorithms=signing_algos,
        audience=oidc_audience,
    )

    return data


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
    try:
        # res = requests.post(
        #     f"{settings.oidc_issuer}/token/introspection",
        #     data={"token": token},
        #     auth=HTTPBasicAuth("bbe2-back", "aaaa"),
        #     timeout=2,
        # ).json()
        res = verify_jwt(token, settings.oidc_issuer, settings.oidc_audience)

    except Exception as e:
        logging.error("An Error occured while verifying token: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    # logging.info(res)
    # if not res["active"]:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Unauthorized",
    #     )

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
