"""Authentication fastapi dependencies."""

import logging
from enum import Enum
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from itsdangerous import BadSignature, URLSafeTimedSerializer
from passlib.context import CryptContext

from bbe2.config import Settings, get_settings
from bbe2.crud.crud_profile import CRUDProfile
from bbe2.models.user import UserDB
from bbe2.schemas import JwtPayload
from bbe2.utils.permissions import Action, Resource, is_allowed


class ActionTokenValue(Enum):
    CreateResponseByToken = "CreateResponseByToken"
    ResetPassword = "ResetPassword"
    Unsubscribe = "Unsubscribe"

    @property
    def max_age(self) -> int:
        match self:
            case ActionTokenValue.CreateResponseByToken:
                return 3600 * 24 * 7  # 7 jours
            case ActionTokenValue.ResetPassword:
                return 3600  # 1h
            case ActionTokenValue.Unsubscribe:
                return 3600 * 24 * 7  # 7 jours
            case _:
                return 0


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
        settings: Annotated[Settings, Depends(get_settings)],
        token: Annotated[str, Header()],
    ) -> dict:

        # Check user has a valid token
        serializer = URLSafeTimedSerializer(settings.token_secret_key)

        try:
            decoded_payload = serializer.loads(
                token,
                max_age=self.action.max_age,
            )
        except BadSignature as e:
            logging.error("Invalid token %s", e)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token"
            ) from e
        if decoded_payload.get("action") != self.action.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token"
            )

        return decoded_payload
