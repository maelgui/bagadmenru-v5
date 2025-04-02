"""Authentication fastapi dependencies."""

import logging
from enum import Enum
from typing import Annotated

import httpx
import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from itsdangerous import BadSignature, URLSafeTimedSerializer
from passlib.context import CryptContext

from bbe2.config import Settings, get_settings
from bbe2.crud.crud_profile import CRUDProfile
from bbe2.models import UserDB
from bbe2.schemas import JwtPayload


class Action(Enum):
    VIEW = "view"
    EDIT = "edit"
    CREATE = "create"
    DELETE = "delete"


class Resource(Enum):
    ME = "me"

    EVENT = "event"
    RESPONSE = "response"

    ALBUM = "album"
    PHOTO = "photo"
    FILE = "file"

    PROFILE = "profile"
    GROUP = "group"
    EMAIL = "email"


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


async def is_authorized(payload: dict, settings: Settings) -> bool:

    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(settings.authorizer_api_endpoint, json=payload)
        r.raise_for_status()
        data = r.json()
    except httpx.HTTPError as e:
        logging.error("Unabe to query opa: %s", e)
        return False

    return data["allow"]


class Authorization:
    def __init__(self, action: Action, resource: Resource):
        self.action = action.value
        self.resource = resource.value

    async def __call__(
        self,
        settings: Annotated[Settings, Depends(get_settings)],
        access_token: Annotated[str, Depends(credentials)],
    ) -> JwtPayload:
        """Checks oauth access token, checks scope, and return token content.

        Args:
            security_scopes (SecurityScopes): Required security scopes
            token (str, optional): OAuth access token. Defaults to Depends(oauth2_scheme).

        Raises:
            HTTPException: 401 when token invalid, 403 when scope missing

        Returns:
            dict[str, Any]: access token content
        """

        # Check user has a valid token
        decoded_token = verify_token(access_token, settings)
        if not decoded_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
            )

        # Check user is authorized to perform action on resource
        opa_payload = {
            "user": {
                "id": decoded_token.sub,
                "roles": decoded_token.roles,
            },
            "action": self.action,
            "resource": self.resource,
        }
        if not (await is_authorized(opa_payload, settings)):
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
