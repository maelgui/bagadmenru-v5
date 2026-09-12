import base64
import secrets
from datetime import datetime, timezone
from typing import Annotated, Iterable

import sentry_sdk
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    HTTPException,
    Request,
    Response,
)
from sqlalchemy import select, update
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import parse_authentication_credential_json
from webauthn.helpers.exceptions import (
    InvalidAuthenticationResponse,
    InvalidJSONStructure,
    InvalidRegistrationResponse,
)
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from bbe2 import schemas
from bbe2.config import Settings
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.models.action_token import ActionTokenValue
from bbe2.models.passkey import PasskeyDB
from bbe2.models.user import UserDB
from bbe2.schemas.auth import (
    LoginData,
    LoginType,
    LogoutRequest,
    ResetPassword,
    ResetPasswordRequest,
    SessionInfo,
    Token,
)
from bbe2.services.notifications import send_password_reset_email
from bbe2.utils.action_token import create_action_token
from bbe2.utils.auth import (
    ACTIVE_ACCOUNT_COOKIE,
    LEGACY_ACCESS_TOKEN_COOKIE,
    SESSION_COOKIE_PREFIX,
    Action,
    ActionTokenAuthorization,
    Authorization,
    Resource,
    clear_active_account_cookie,
    clear_legacy_access_token_cookie,
    clear_session_cookie,
    create_access_token,
    get_current_profile,
    myctx,
    set_active_account_cookie,
    set_session_cookies,
    verify_token,
)
from bbe2.utils.correlation import get_correlation_id

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    """Return the real client IP.

    Behind the Traefik ingress every request reaches the app from the proxy,
    so request.client.host is the proxy address. Uvicorn is started with
    --proxy-headers, which rewrites request.client.host from the last hop of
    X-Forwarded-For; we still read the header's first entry directly to capture
    the original client when the chain has multiple hops.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 -> take the first entry.
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/auth/login")
def prepare_login(request: Request, settings: SettingsDep):
    opt = generate_authentication_options(
        rp_id=settings.relying_party_id,
    )

    # save challenge as base64 in session
    request.session["auth_challenge"] = base64.b64encode(opt.challenge).decode("utf-8")

    return Response(
        content=options_to_json(opt),
        media_type="application/json",
    )


@router.post("/auth/login")
def process_login(
    data: LoginData,
    settings: SettingsDep,
    session: SessionDep,
    response: Response,
    request: Request,
) -> Token:
    match data.type:
        case LoginType.PASSWORD:
            user = session.scalars(
                select(UserDB).where(UserDB.email == data.email)
            ).first()
            if not user or not user.is_active:
                myctx.dummy_verify()
                raise HTTPException(status_code=401, detail="Bad credentials")
            if not data.password:
                raise HTTPException(status_code=400, detail="Password is required")
            if not user.password:
                # Passkey-only account with no password hash set.
                myctx.dummy_verify()
                raise HTTPException(status_code=401, detail="Bad credentials")
            valid, new_hash = myctx.verify_and_update(data.password, user.password)
            if not valid:
                raise HTTPException(status_code=401, detail="Bad credentials")
            if new_hash:
                session.execute(
                    update(UserDB).where(UserDB.id == user.id).values(password=new_hash)
                )
            # The login page prepares a conditional (autofill) passkey login on
            # mount, leaving an auth_challenge in the cookie session. After a
            # *password* login it is dead weight: drop it so the session
            # empties and Starlette stops re-issuing the stale cookie on every
            # subsequent response.
            request.session.pop("auth_challenge", None)
        case LoginType.PASSKEY:
            if not data.passkey:
                raise HTTPException(
                    status_code=400, detail="Passkey credential is required"
                )
            credential = parse_authentication_credential_json(data.passkey)
            passkey = session.scalar(
                select(PasskeyDB).where(PasskeyDB.credential_id == credential.raw_id)
            )
            if not passkey or not passkey.user.is_active:
                raise HTTPException(status_code=401, detail="Bad credentials")
            challenge = request.session.get("auth_challenge")
            if not challenge:
                raise HTTPException(
                    status_code=400, detail="No authentication challenge in session"
                )
            try:
                res = verify_authentication_response(
                    credential=credential,
                    credential_public_key=passkey.public_key,
                    credential_current_sign_count=passkey.sign_count,
                    expected_challenge=base64.b64decode(challenge),
                    expected_rp_id=settings.relying_party_id,
                    expected_origin=str(settings.frontend_base_url).rstrip("/"),
                    # UV is requested as "preferred" in the options, so we do
                    # not hard-require it here. This keeps sign-in smooth on
                    # devices without a biometric sensor. WebAuthn itself still
                    # provides phishing resistance without a second factor.
                    require_user_verification=False,
                )
            except InvalidAuthenticationResponse as exc:
                raise HTTPException(status_code=401, detail="Bad credentials") from exc
            finally:
                # A challenge is single-use, regardless of the outcome.
                request.session.pop("auth_challenge", None)
            # User authenticated, update sign count
            user = passkey.user
            session.execute(
                update(PasskeyDB)
                .where(PasskeyDB.credential_id == credential.raw_id)
                .values(
                    sign_count=res.new_sign_count,
                    last_use_at=datetime.now(timezone.utc),
                    last_use_ip=_client_ip(request),
                    last_use_ua=request.headers.get("user-agent"),
                )
            )

    # Add this account as an additive browser session (multi-account) and make
    # it the active one. Any other signed-in accounts keep their sessions.
    access_token = create_access_token(user, settings)
    set_session_cookies(response, user.id, access_token, settings)
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/auth/verify",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.EMAIL))],
    status_code=204,
)
def verify_email_access() -> Response:
    """Forward-auth gate for the Mailpit UI (beta).

    Reachable through Traefik's ``forwardAuth`` middleware, which replays the
    caller's cookies here before serving the internal Mailpit service. A 204
    means the browser holds a valid session whose role grants ``VIEW:EMAIL``
    (staff/admin); the ``Authorization`` dependency raises 401/403 otherwise.
    The body is empty on purpose: only the status code matters to Traefik.
    """
    return Response(status_code=204)


@router.post("/auth/reset")
def reset_password(
    body: ResetPassword,
    token_payload: Annotated[
        dict, Depends(ActionTokenAuthorization(ActionTokenValue.ResetPassword))
    ],
    session: SessionDep,
    settings: SettingsDep,
    response: Response,
):
    """Set the new password and sign the member in.

    Mirrors the invitation-accept flow: proving control of the email (the
    reset link) plus setting the password is a full authentication, so the
    member lands signed in (additive session cookies, becomes the active
    account) instead of being bounced to the login form. The client can then
    offer passkey enrolment right away (FIDO account-recovery pattern).

    The response body stays "OK" so the generated client is unchanged; the
    session travels in the cookies.
    """
    if body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="password mismatch")

    user = session.scalars(
        select(UserDB).where(UserDB.id == token_payload["user_id"])
    ).first()
    # The token was only issued for an existing, active account, but the
    # account may have been deactivated since: do not resurrect its access.
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Invalid token")

    user.password = myctx.hash(body.password)
    session.commit()

    access_token = create_access_token(user, settings)
    set_session_cookies(response, user.id, access_token, settings)
    return "OK"


def _enumerate_sessions(
    request: Request, settings: Settings, active_account: str | None
) -> list[SessionInfo]:
    """Decode every ``bmr_session_*`` cookie into a SessionInfo list.

    Invalid or expired session cookies are skipped. Identity (name + email)
    comes straight from the JWT, so no DB hit is needed.
    """
    sessions: list[SessionInfo] = []
    for name, value in request.cookies.items():
        if not name.startswith(SESSION_COOKIE_PREFIX):
            continue
        payload = verify_token(value, settings)
        if payload is None:
            continue
        sessions.append(
            SessionInfo(
                id=payload.sub,
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                active=payload.sub == active_account,
            )
        )
    return sessions


@router.get("/auth/sessions", response_model=list[SessionInfo])
def list_sessions(request: Request, settings: SettingsDep) -> list[SessionInfo]:
    """Return all accounts currently signed in this browser (multi-account).

    Public endpoint (no auth dependency): it only reflects the cookies the
    caller already holds and never reveals anything about accounts whose signed
    session cookie is not present.
    """
    active_account = request.cookies.get(ACTIVE_ACCOUNT_COOKIE)
    return _enumerate_sessions(request, settings, active_account)


@router.post("/auth/logout", response_model=list[SessionInfo])
def logout(
    request: Request,
    response: Response,
    settings: SettingsDep,
    body: LogoutRequest | None = None,
) -> list[SessionInfo]:
    """Sign out of a single account and return the remaining sessions.

    Deletes only the targeted account's session cookie (``account_id`` in the
    body, defaulting to the active account). Other accounts stay signed in. When
    no sessions remain the ``active_account`` selector is cleared too. The
    legacy single-session ``access_token`` cookie is also cleared when it is the
    thing being logged out, for backward compatibility.

    When ``all`` is true, every account signed in this browser is signed out at
    once (``account_id`` is ignored) and an empty list is returned. This only
    clears cookies in the current browser; sessions on other devices are not
    revoked (tokens are stateless and carry no server-side session record).
    """
    active_account = request.cookies.get(ACTIVE_ACCOUNT_COOKIE)

    if body and body.all:
        # Sign out of every account in this browser: delete each per-account
        # session cookie, the legacy cookie, and the selector.
        for name in request.cookies:
            if name.startswith(SESSION_COOKIE_PREFIX):
                user_id = name[len(SESSION_COOKIE_PREFIX) :]
                clear_session_cookie(response, user_id, settings)
        if request.cookies.get(LEGACY_ACCESS_TOKEN_COOKIE):
            clear_legacy_access_token_cookie(response, settings)
        clear_active_account_cookie(response, settings)
        return []

    target = (body.account_id if body else None) or active_account

    if target:
        clear_session_cookie(response, target, settings)

    # Backward-compat: if the user only had the legacy cookie, honour a logout.
    has_session_cookies = any(
        name.startswith(SESSION_COOKIE_PREFIX) for name in request.cookies
    )
    if not has_session_cookies and request.cookies.get(LEGACY_ACCESS_TOKEN_COOKIE):
        clear_legacy_access_token_cookie(response, settings)

    # Compute the sessions that will remain (exclude the one we just deleted).
    remaining = [
        s
        for s in _enumerate_sessions(request, settings, active_account)
        if s.id != target
    ]

    if not remaining:
        # Nothing left active: drop the stale selector so the browser is clean.
        clear_active_account_cookie(response, settings)
    elif target == active_account:
        # The active account was removed: promote the first remaining session so
        # the very next request already resolves to a valid account even before
        # the frontend rewrites the selector.
        new_active = remaining[0]
        set_active_account_cookie(response, new_active.id, settings)
        remaining = [
            s.model_copy(update={"active": s.id == new_active.id}) for s in remaining
        ]

    return remaining


@router.post("/auth/reset_password_request")
async def reset_password_request(
    body: ResetPasswordRequest,
    settings: SettingsDep,
    session: SessionDep,
    sender: SenderDep,
    background_tasks: BackgroundTasks,
) -> str:
    user = session.scalars(select(UserDB).where(UserDB.email == body.email)).first()
    if not user or not user.is_active:
        return "OK"

    token = create_action_token(
        session,
        ActionTokenValue.ResetPassword,
        {"user_id": user.id},
    )
    session.commit()

    # Send off the request's critical path: a slow/unreachable SMTP server must
    # not stall (or fail) this response. The token is already persisted, so the
    # link is valid immediately. Capture the correlation ID now and re-set it in
    # the task, which runs outside this request's context.
    background_tasks.add_task(
        send_password_reset_email,
        sender,
        user.email,
        token,
        str(settings.frontend_base_url).rstrip("/"),
        get_correlation_id(),
    )

    return "OK"


@router.get(
    "/webauthn/",
    dependencies=[Depends(Authorization(Action.VIEW, Resource.ME))],
    response_model=list[schemas.Passkey],
)
async def list_passkeys(
    current_user: Annotated[UserDB, Depends(get_current_profile)],
    session: SessionDep,
):
    q = select(PasskeyDB).where(
        PasskeyDB.passkey_user_id == current_user.passkey_user_id
    )
    res = session.scalars(q).all()
    return res


@router.get(
    "/webauthn/preregister",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ME))],
)
async def preregister_passkey(
    request: Request,
    current_user: Annotated[UserDB, Depends(get_current_profile)],
    session: SessionDep,
    settings: SettingsDep,
):
    existing_credentials: Iterable[PasskeyDB] = []
    if current_user.passkey_user_id is None:
        # Generate
        passkey_user_id = secrets.token_bytes()
        session.execute(
            update(UserDB)
            .where(UserDB.id == current_user.id)
            .values(passkey_user_id=passkey_user_id)
        )
    else:
        passkey_user_id = current_user.passkey_user_id
        existing_credentials = session.scalars(
            select(PasskeyDB).where(
                PasskeyDB.passkey_user_id == current_user.passkey_user_id
            )
        ).all()

    simple_registration_options = generate_registration_options(
        rp_id=settings.relying_party_id,
        rp_name=settings.relying_party_name,
        user_name=current_user.email,
        user_id=passkey_user_id,
        user_display_name=f"{current_user.first_name} {current_user.last_name}",
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=key.credential_id)
            for key in existing_credentials
        ],
        # We do not verify attestation statements server-side, so request none.
        # Asking for attestation we ignore only adds a privacy prompt on some
        # platforms without any security benefit here.
        attestation=AttestationConveyancePreference.NONE,
    )

    # Save the challenge (base64) in the cookie session. Safe against the
    # post-login request burst since Starlette >= 1.0: SessionMiddleware only
    # re-issues the Set-Cookie when the session was actually MODIFIED, so a
    # concurrent read-only response can no longer clobber this write with a
    # stale cookie (Kludex/starlette#3166 - that race used to lose the
    # challenge after the browser had already created the passkey, leaving an
    # orphan credential in the user's keychain).
    request.session["reg_challenge"] = base64.b64encode(
        simple_registration_options.challenge
    ).decode("utf-8")

    return Response(
        content=options_to_json(simple_registration_options),
        media_type="application/json",
    )


@router.post(
    "/webauthn/register",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ME))],
)
async def register_passkey(
    body: Annotated[dict, Body()],
    request: Request,
    current_user: Annotated[UserDB, Depends(get_current_profile)],
    session: SessionDep,
    settings: SettingsDep,
) -> str:
    challenge = request.session.get("reg_challenge")
    if not challenge:
        # Diagnostic: which session keys survived tells whether the cookie was
        # clobbered (stale keys), never set, or emptied entirely.
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("feature", "webauthn-register")
            scope.set_extra("session_keys", sorted(request.session.keys()))
            scope.set_extra("has_session_cookie", "session" in request.cookies)
            sentry_sdk.capture_message(
                "webauthn/register: no registration challenge in session",
                level="warning",
            )
        raise HTTPException(
            status_code=400, detail="No registration challenge in session"
        )
    try:
        verification = verify_registration_response(
            credential=body,
            expected_challenge=base64.b64decode(challenge),
            expected_rp_id=settings.relying_party_id,
            expected_origin=str(settings.frontend_base_url).rstrip("/"),
            # UV requested as "preferred" in the options; not hard-required
            # here to keep passkey enrollment smooth on all devices.
            require_user_verification=False,
            # A conditional create (silent passkey upgrade after password
            # login) happens by design without any user gesture, so the UP
            # flag is 0 in its attestation. WebAuthn L3 tells RPs supporting
            # conditional creation not to require user presence at
            # registration; the caller is already authenticated here.
            require_user_presence=False,
        )
    except (InvalidJSONStructure, InvalidRegistrationResponse) as exc:
        # Bad client data (malformed credential JSON or a failed WebAuthn
        # verification) is a 400, not a 500. py_webauthn's message pinpoints
        # the exact check that failed (origin, RP ID, challenge mismatch...)
        # but the client only ever sees the generic detail — capture it.
        with sentry_sdk.new_scope() as scope:
            scope.set_tag("feature", "webauthn-register")
            scope.set_extra("expected_rp_id", settings.relying_party_id)
            scope.set_extra(
                "expected_origin", str(settings.frontend_base_url).rstrip("/")
            )
            sentry_sdk.capture_exception(exc)
        raise HTTPException(
            status_code=400, detail="Invalid registration response"
        ) from exc
    finally:
        # A challenge is single-use, regardless of the outcome.
        request.session.pop("reg_challenge", None)

    passkey_db = PasskeyDB(
        passkey_user_id=current_user.passkey_user_id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        # The column/schema store transports as a space-delimited string
        # (the WebAuthn convention), so normalise the JS array here.
        transports=" ".join(body["response"].get("transports", []) or []),
        device_type=verification.credential_device_type,
        back_up=verification.credential_backed_up,
        aaguid=verification.aaguid,
        last_use_at=None,
        last_use_ip=None,
        last_use_ua=None,
    )
    session.add(passkey_db)

    return "OK"


@router.delete(
    "/webauthn/{credential_id}",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ME))],
)
async def delete_passkey(
    credential_id: str,
    current_user: Annotated[UserDB, Depends(get_current_profile)],
    session: SessionDep,
) -> str:
    q = (
        select(PasskeyDB)
        .where(PasskeyDB.passkey_user_id == current_user.passkey_user_id)
        .where(PasskeyDB.credential_id == base64.urlsafe_b64decode(credential_id))
    )
    res = session.scalars(q).first()
    if not res:
        raise HTTPException(status_code=404, detail="Passkey not found")
    session.delete(res)
    session.commit()

    return "OK"
