"""Authentication fastapi dependencies."""

import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2AuthorizationCodeBearer, SecurityScopes
from jose import JWTError

from bbe2.config import settings
from bbe2.utils.jwt import JWTVerifier

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    tokenUrl=str(settings.oidc_token_url),
    authorizationUrl=str(settings.oidc_authorization_url),
)
jwt_verifier = JWTVerifier(settings.jwt_audience, str(settings.jwt_issuer))


async def get_current_user(
    request: Request,
    security_scopes: SecurityScopes,
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
    identifier = request.session.get("identifier")
    permissions = request.session.get("permissions")
    email = request.session.get("email")
    if not identifier or not permissions or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    logging.info(
        "validating: userId=%s, userEmail=%s, userPermissions=%s, requiredPermissions=%s",
        identifier,
        email,
        permissions,
        security_scopes.scopes,
    )
    for permission in security_scopes.scopes:
        if permission not in permissions:
            logging.warning("Unauthorized access: missing role %s", permission)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
    return identifier
