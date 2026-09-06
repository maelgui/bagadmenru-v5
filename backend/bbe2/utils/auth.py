"""Authentication fastapi dependencies."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
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

# Multi-account cookies. Each signed-in account keeps its own httpOnly session
# cookie ``bmr_session_<userId>`` holding that account's JWT, so adding or
# removing an account never clobbers another. A single non-httpOnly selector
# cookie ``active_account`` names which of those sessions is currently active;
# it is not a credential (it only points at a signed session cookie) so it is
# safe to read/write from JS for instant client-side switching.
SESSION_COOKIE_PREFIX = "bmr_session_"
ACTIVE_ACCOUNT_COOKIE = "active_account"

# Legacy single-session cookie, still accepted for backward compatibility so
# users signed in before the multi-account rollout are not logged out.
LEGACY_ACCESS_TOKEN_COOKIE = "access_token"

# HTTP Bearer security scheme. Declared as a (non-erroring) dependency of
# ``credentials`` so FastAPI documents the Authorization header once in the
# OpenAPI ``securitySchemes`` (a Swagger "Authorize" button + a bearer field on
# the generated client), instead of leaking it as a duplicated per-endpoint
# parameter. ``auto_error=False`` keeps it optional so cookie-based sessions
# (the browser default) still work when no header is sent.
bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")


def _session_cookie_name(user_id: str) -> str:
    """Return the per-account session cookie name for ``user_id``."""
    return f"{SESSION_COOKIE_PREFIX}{user_id}"


def create_access_token(user: UserDB, settings: Settings) -> str:
    """Build and sign a JWT access token for ``user`` (no cookie side effect)."""
    now = datetime.now(timezone.utc)
    payload = JwtPayload(
        sub=user.id,
        roles=[r.id for g in user.groups for r in g.roles],
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        iat=now,
        exp=now + timedelta(seconds=settings.access_token_max_age_seconds),
    ).model_dump()
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def set_active_account_cookie(
    response: Response, user_id: str, settings: Settings
) -> None:
    """Point the ``active_account`` selector cookie at ``user_id``.

    NOT httpOnly so the frontend can switch accounts by rewriting it; it names
    which signed session cookie to use and is not a credential on its own.
    """
    response.set_cookie(
        key=ACTIVE_ACCOUNT_COOKIE,
        value=user_id,
        max_age=settings.access_token_max_age_seconds,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def set_session_cookies(
    response: Response, user_id: str, token: str, settings: Settings
) -> None:
    """Add ``user_id`` as an active browser session (multi-account).

    Sets the per-account httpOnly session cookie ``bmr_session_<user_id>`` and
    points the ``active_account`` selector cookie at this user. Both are
    additive: any other accounts' session cookies are left untouched, so this
    never logs out a session already present in the browser. This is the single
    entry point for establishing a session (login and legacy migration).
    """
    response.set_cookie(
        key=_session_cookie_name(user_id),
        value=token,
        max_age=settings.access_token_max_age_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    set_active_account_cookie(response, user_id, settings)


def clear_session_cookie(response: Response, user_id: str, settings: Settings) -> None:
    """Delete only ``user_id``'s session cookie (never all sessions)."""
    response.delete_cookie(
        key=_session_cookie_name(user_id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_active_account_cookie(response: Response, settings: Settings) -> None:
    """Delete the ``active_account`` selector cookie (no sessions remain)."""
    response.delete_cookie(
        key=ACTIVE_ACCOUNT_COOKIE,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _migrate_legacy_cookie(response: Response, token: str, settings: Settings) -> None:
    """Rewrite a legacy ``access_token`` cookie as a multi-account session.

    Sets ``bmr_session_<sub>`` + ``active_account`` from the (already valid)
    legacy JWT and deletes the legacy cookie, so a browser signed in before the
    multi-account rollout is upgraded in place the first time it authenticates.
    A no-op if the token cannot be decoded (the caller still returns it and lets
    validation 401).
    """
    payload = verify_token(token, settings)
    if payload is None:
        return
    # Establish the session through the one entry point, then drop the legacy
    # cookie. Reusing the same signed JWT keeps identity and expiry unchanged.
    set_session_cookies(response, payload.sub, token, settings)
    response.delete_cookie(
        key=LEGACY_ACCESS_TOKEN_COOKIE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    logging.info("Migrated legacy access_token cookie to bmr_session_%s", payload.sub)


def credentials(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    bearer: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
):
    """Resolve the raw JWT for the current request (multi-account aware).

    Selection order:

    1. ``Authorization: Bearer`` header (documented via the HTTPBearer security
       scheme) — used by API clients.
    2. The session named by the ``active_account`` selector cookie, if its
       ``bmr_session_<active_account>`` cookie is present.
    3. If exactly one ``bmr_session_*`` cookie exists, use it.
    4. Backward-compat: the legacy ``access_token`` cookie. When it is used, it
       is migrated in place to a ``bmr_session_<id>`` session so this is the one
       and only spot that has to know about the legacy cookie.
    5. Otherwise 401.

    A stale selector (naming a missing/removed session) must not lock the user
    out, so step 2 falls through to steps 3/4 rather than raising.
    """
    if bearer is not None:
        logging.info("Token from authorization header")
        return bearer.credentials

    session_cookies = {
        name: value
        for name, value in request.cookies.items()
        if name.startswith(SESSION_COOKIE_PREFIX)
    }

    active_account = request.cookies.get(ACTIVE_ACCOUNT_COOKIE)
    if active_account:
        selected = session_cookies.get(_session_cookie_name(active_account))
        if selected:
            logging.info("Token from active_account session cookie")
            return selected

    if len(session_cookies) == 1:
        logging.info("Token from sole session cookie")
        return next(iter(session_cookies.values()))

    legacy = request.cookies.get(LEGACY_ACCESS_TOKEN_COOKIE)
    if legacy:
        logging.info("Token from legacy access_token cookie (migrating)")
        _migrate_legacy_cookie(response, legacy, settings)
        return legacy

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
