import base64
import secrets
from datetime import datetime, timedelta
from typing import Annotated, Iterable

import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select, update
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import parse_authentication_credential_json
from webauthn.helpers.exceptions import InvalidAuthenticationResponse
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from bbe2 import schemas
from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.models.passkey import PasskeyDB
from bbe2.models.user import UserDB
from bbe2.schemas.auth import (
    JwtPayload,
    LoginData,
    LoginType,
    ResetPassword,
    ResetPasswordRequest,
    Token,
)
from bbe2.utils.auth import (
    Action,
    ActionTokenAuthorization,
    ActionTokenValue,
    Authorization,
    Resource,
    get_current_profile,
    myctx,
)
from bbe2.utils.templates import EmailData

router = APIRouter()


@router.get("/auth/login")
def prepare_login(request: Request, settings: SettingsDep):
    opt = generate_authentication_options(
        rp_id=settings.relying_party_id,
    )

    # save challenge as base64 in session
    request.session["challenge"] = base64.b64encode(opt.challenge).decode("utf-8")

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
            if not user:
                myctx.dummy_verify()
                raise HTTPException(status_code=401, detail="Bad credentials")
            if not data.password:
                raise HTTPException(status_code=400, detail="Password is required")
            valid, new_hash = myctx.verify_and_update(data.password, user.password)
            if not valid:
                raise HTTPException(status_code=401, detail="Bad credentials")
            if new_hash:
                session.execute(
                    update(UserDB).where(UserDB.id == user.id).values(password=new_hash)
                )
        case LoginType.PASSKEY:
            if not data.passkey:
                raise HTTPException(
                    status_code=400, detail="Passkey credential is required"
                )
            credential = parse_authentication_credential_json(data.passkey)
            passkey = session.scalar(
                select(PasskeyDB).where(PasskeyDB.credential_id == credential.raw_id)
            )
            if not passkey:
                raise HTTPException(status_code=401, detail="Bad credentials")
            try:
                res = verify_authentication_response(
                    credential=credential,
                    credential_public_key=passkey.public_key,
                    credential_current_sign_count=passkey.sign_count,
                    expected_challenge=base64.b64decode(request.session["challenge"]),
                    expected_rp_id=settings.relying_party_id,
                    expected_origin=settings.frontend_base_url,
                    require_user_verification=False,
                )
            except InvalidAuthenticationResponse as exc:
                raise HTTPException(status_code=401, detail="Bad credentials") from exc
            if not res.user_verified:
                raise HTTPException(status_code=401, detail="Bad credentials")
            # User authenticated, update sign count
            user = passkey.user
            print(datetime.now())
            session.execute(
                update(PasskeyDB)
                .where(PasskeyDB.credential_id == credential.raw_id)
                .values(
                    sign_count=res.new_sign_count,
                    last_use_at=datetime.now(),
                    last_use_ip=request.client.host,  # type: ignore
                    last_use_ua=request.headers.get("user-agent"),
                )
            )

    payload = JwtPayload(
        sub=user.id,
        roles=[r.id for g in user.groups for r in g.roles],
        first_name=user.first_name,
        last_name=user.last_name,
        iat=datetime.now(),
        exp=datetime.now() + timedelta(hours=48),
    ).model_dump()
    access_token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
    response.set_cookie(key="access_token", value=access_token)
    return Token(access_token=access_token, token_type="bearer")


@router.post("/auth/reset")
def reset_password(
    body: ResetPassword,
    token_payload: Annotated[
        dict, Depends(ActionTokenAuthorization(ActionTokenValue.ResetPassword))
    ],
    session: SessionDep,
):
    if body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="password mismatch")

    hashed_password = myctx.hash(body.password)
    stmt = (
        update(UserDB)
        .where(UserDB.id == token_payload["user_id"])
        .values(password=hashed_password)
    )

    session.execute(stmt)
    session.commit()

    return "OK"


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {}


@router.post("/auth/reset_password_request")
async def reset_password_request(
    body: ResetPasswordRequest,
    settings: SettingsDep,
    session: SessionDep,
    sender: SenderDep,
):
    user = session.scalars(select(UserDB).where(UserDB.email == body.email)).first()
    if not user:
        return "OK"

    serializer = URLSafeTimedSerializer(settings.token_secret_key)
    token = serializer.dumps(
        {
            "user_id": user.id,
            "action": ActionTokenValue.ResetPassword.value,
        }
    )

    await sender.batch_send_emails(
        "Reinitialisation de votre mot de passe.",
        "reset_password",
        [
            EmailData(
                to=user.email,
                template_data={
                    "token": token,
                    "user": user,
                    "frontend_url": settings.frontend_base_url,
                },
            ),
        ],
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
    if current_user.passkey_user_id == None:
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
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=key.credential_id)
            for key in existing_credentials
        ],
        attestation=AttestationConveyancePreference.INDIRECT,
    )

    # save challenge as base64 in session
    request.session["challenge"] = base64.b64encode(
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
):
    verification = verify_registration_response(
        credential=body,
        expected_challenge=base64.b64decode(request.session["challenge"]),
        expected_rp_id=settings.relying_party_id,
        expected_origin=settings.frontend_base_url,
        require_user_verification=False,
    )

    passkey_db = PasskeyDB(
        passkey_user_id=current_user.passkey_user_id,
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        transports=body["response"]["transports"],
        device_type=verification.credential_device_type,
        back_up=verification.credential_backed_up,
        aaguid=verification.aaguid,
        last_use_at=None,
        last_use_ip=None,
        last_use_ua=None,
    )
    session.add(passkey_db)

    # return Response(
    #     content=verification,
    #     media_type="application/json",
    # )


@router.delete(
    "/webauthn/{credential_id}",
    dependencies=[Depends(Authorization(Action.EDIT, Resource.ME))],
)
async def delete_passkey(
    credential_id: str,
    current_user: Annotated[UserDB, Depends(get_current_profile)],
    session: SessionDep,
):
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
