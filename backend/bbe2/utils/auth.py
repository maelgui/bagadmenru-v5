"""Authentication fastapi dependencies."""

import logging
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session as DbSession

from bbe2.config import Settings, get_settings
from bbe2.crud.crud_profile import CRUDProfile
from bbe2.database import get_session
from bbe2.models.action_token import ActionTokenValue
from bbe2.models.user import UserDB
from bbe2.schemas import JwtPayload
from bbe2.utils.action_token import consume_action_token
from bbe2.utils.permissions import Action, Resource, is_allowed


def credentials(
    authorization: Annotated[str | None, Header()] = None,
    access_token: Annotated[str | None, Cookie()] = None,
):
    if authorization:
        logging.info("Token from authorization header")
        return authorization.replace("Bearer ", "")

    if access_token:
        logging.info("Token from cookie")
        return access_token

    logging.info("No token found")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized",
    )


def verify_token(token: str, settings: Settings) -> JwtPayload | None:
    try:
        res = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=["HS256"],
        )
        payload = JwtPayload(**res)
    except jwt.PyJWTError as e:
        logging.error("An Error occured while verifying token: %s", e)
        return None

    return payload


class Authorization:
    def __init__(self, action: Action, resource: Resource):
        self.action = action
        self.resource = resource

    async def __call__(
        self,
        settings: Annotated[Settings, Depends(get_settings)],
        access_token: Annotated[str, Depends(credentials)],
    ) -> JwtPayload:
        """Checks oauth access token and permissions, returns token content.

        Raises:
            HTTPException: 401 when token invalid, 403 when permission denied

        Returns:
            JwtPayload: decoded access token content
        """

        # Check user has a valid token
        decoded_token = verify_token(access_token, settings)
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
            )

        # Check user is authorized to perform action on resource
        if not is_allowed(decoded_token.roles, self.action, self.resource):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )

        return decoded_token


def get_current_user2(
    payload: Annotated[JwtPayload, Depends(Authorization(Action.VIEW, Resource.ME))],
):
    return payload.sub


def get_current_profile(
    payload: Annotated[JwtPayload, Depends(Authorization(Action.VIEW, Resource.ME))],
    profile_crud: Annotated[CRUDProfile, Depends()],
):
    db_profile = profile_crud.find_one_by(UserDB.id == payload.sub)
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return db_profile


myctx = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated=["bcrypt"],
)


class ActionTokenAuthorization:
    def __init__(self, action: ActionTokenValue):
        self.action = action

    async def __call__(
        self,
        session: Annotated[DbSession, Depends(get_session)],
        token: Annotated[str, Header()],
    ) -> dict:
        payload = consume_action_token(session, token, self.action)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token"
            )
        # For single-use tokens, consume_action_token stamps used_at on the row.
        # We deliberately do not commit here: the shared get_session dependency
        # commits when the request handler returns successfully, so the token is
        # marked used only if the whole operation (e.g. the password reset)
        # succeeds. If the handler fails and rolls back, the token stays valid
        # for a retry.
        return payload
