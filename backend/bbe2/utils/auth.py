"""Authentication fastapi dependencies."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
import sentry_sdk
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
from bbe2.utils.api_key import resolve_api_key
from bbe2.utils.permissions import Action, Resource, is_allowed, permission_string

# Header carrying a per-member API key for machine clients. A query parameter
# (``api_key``) is also accepted for clients that cannot set headers -- notably
# calendar apps subscribing to an ICS feed by URL.
API_KEY_HEADER = "X-API-Key"

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


def clear_legacy_access_token_cookie(response: Response, settings: Settings) -> None:
    """Delete the legacy single-session ``access_token`` cookie."""
    response.delete_cookie(
        key=LEGACY_ACCESS_TOKEN_COOKIE,
        httponly=True,
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
    clear_legacy_access_token_cookie(response, settings)
    logging.info("Migrated legacy access_token cookie to bmr_session_%s", payload.sub)


@dataclass
class AuthContext:
    """The authenticated identity for a request, and any per-key narrowing.

    ``payload`` is the member's decoded JWT (their roles drive RBAC). When the
    request authenticated via an API key, ``key_permissions`` is the subset of
    permissions ("action:resource") that key is allowed to exercise -- the key
    can only ever narrow, never widen, the member's rights. For a normal
    cookie/JWT session ``key_permissions`` is ``None`` (no narrowing: the member
    exercises all their permissions).
    """

    payload: JwtPayload
    key_permissions: frozenset[str] | None


def credentials(
    request: Request,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[DbSession, Depends(get_session)],
    bearer: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> AuthContext:
    """Resolve the authenticated identity for the current request.

    Returns an :class:`AuthContext`: the member's decoded JWT plus, for API-key
    requests, the permissions that key may exercise (``None`` for cookie/JWT
    sessions). Raises 401 if no valid credential is present.

    Credential selection order:

    0. A per-member API key (``X-API-Key`` header or ``api_key`` query param).
       The key authenticates the owning member and carries a narrowing set of
       permissions (see :class:`AuthContext`).
    1. ``Authorization: Bearer`` header - used by API clients.
    2. The session named by the ``active_account`` selector cookie, if its
       ``bmr_session_<active_account>`` cookie is present.
    3. If exactly one ``bmr_session_*`` cookie exists, use it.
    4. Backward-compat: the legacy ``access_token`` cookie, migrated in place to
       a ``bmr_session_<id>`` session.

    A stale selector (naming a missing/removed session) must not lock the user
    out, so step 2 falls through to steps 3/4 rather than raising.
    """
    api_context = _api_key_context(request, session, settings)
    if api_context is not None:
        logging.info("Authenticated from API key")
        return api_context

    token = _session_token(request, response, bearer, settings)
    payload = verify_token(token, settings)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    # A cookie/JWT session is not narrowed: the member exercises all their rights.
    return AuthContext(payload=payload, key_permissions=None)


def _session_token(
    request: Request,
    response: Response,
    bearer: HTTPAuthorizationCredentials | None,
    settings: Settings,
) -> str:
    """Return the raw JWT from the bearer header or a session cookie (or 401)."""
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
        auth: Annotated[AuthContext, Depends(credentials)],
    ) -> JwtPayload:
        """Authorize the current request, returning the member's token payload.

        Two checks, read top to bottom:
        1. the member's roles must grant ``action`` on ``resource`` (RBAC);
        2. if the request authenticated via an API key, that key must also list
           the permission (a key only narrows the member's rights).

        Raises 403 if either check fails.
        """
        payload = auth.payload

        # Attach the authenticated user to the Sentry scope so errors and traces
        # are grouped per member. We deliberately send only the pseudonymous id
        # and a human-readable name (never the email) and keep send_default_pii
        # off, so no IP address or request body is captured - enough to identify
        # who hit a bug without shipping contact details to Sentry.
        sentry_sdk.set_user(
            {
                "id": payload.sub,
                "username": f"{payload.first_name} {payload.last_name}",
            }
        )

        # 1. The member's roles must allow this action on this resource.
        if not is_allowed(payload.roles, self.action, self.resource):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )

        # 2. An API key only ever narrows: the permission must also be one the
        #    key was granted. Cookie/JWT sessions (key_permissions is None) skip
        #    this and exercise the member's full rights.
        if auth.key_permissions is not None:
            required = permission_string(self.action, self.resource)
            if required not in auth.key_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="API key not authorized for this operation",
                )

        return payload


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


def _extract_api_key(request: Request) -> str | None:
    """Read the raw API key from the ``X-API-Key`` header or ``api_key`` query.

    The header is preferred for programmatic clients; the query parameter exists
    for clients that cannot set headers (calendar apps subscribing to an ICS
    URL). Returns ``None`` if neither is present.
    """
    header_key = request.headers.get(API_KEY_HEADER)
    if header_key:
        return header_key
    return request.query_params.get("api_key")


def _api_key_context(
    request: Request,
    session: DbSession,
    settings: Settings,
) -> AuthContext | None:
    """Build an :class:`AuthContext` from a per-member API key, or ``None``.

    Returns ``None`` when no API key is presented, so the caller falls through
    to cookie/bearer resolution. When a key *is* presented it must be valid;
    otherwise this raises 401 rather than silently falling through, so a bad key
    never quietly downgrades to an anonymous request.

    The key authenticates its owner; the returned context carries the key's
    ``authorized_permissions`` so :class:`Authorization` can narrow accordingly.
    """
    raw_key = _extract_api_key(request)
    if not raw_key:
        return None

    api_key = resolve_api_key(session, raw_key)
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    token = create_access_token(api_key.user, settings)
    payload = verify_token(token, settings)
    # A token we just minted always verifies; guard for mypy/None-safety.
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    return AuthContext(
        payload=payload,
        key_permissions=frozenset(api_key.authorized_permissions),
    )
