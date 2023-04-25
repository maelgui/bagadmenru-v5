import logging

from bbe2.config import settings
from bbe2.utils.jwt import JWTVerifier
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer, SecurityScopes
from jose import JWTError

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    tokenUrl=settings.oidc_token_url,
    authorizationUrl=settings.oidc_authorization_url,
)
jwt_verifier = JWTVerifier(settings.jwt_audience, settings.jwt_issuer)


async def get_current_user(
    security_scopes: SecurityScopes, token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt_verifier.verify(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_roles = payload.get("resource_access", {settings.jwt_audience: {"roles": []}})[settings.jwt_audience]["roles"]
    except JWTError as exp:
        logging.error(exp)
        raise credentials_exception from exp
    # Token scopes contains intersection of requested scopes and user's permissions (auth0 specific)
    for scope in security_scopes.scopes:
        if scope not in token_roles:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not enough permissions",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return payload
