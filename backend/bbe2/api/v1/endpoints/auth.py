import time
from datetime import datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select, update

from bbe2.dependencies import SenderDep, SessionDep, SettingsDep
from bbe2.models.user import UserDB
from bbe2.schemas.auth import (
    JwtPayload,
    LoginData,
    LoginType,
    ResetPassword,
    ResetPasswordRequest,
    Token,
)
from bbe2.utils.auth import ActionTokenAuthorization, ActionTokenValue, myctx
from bbe2.utils.templates import EmailData

router = APIRouter()


@router.get("/auth/login")
def prepare_login():
    return {}


@router.post("/auth/login")
def process_login(
    data: LoginData,
    settings: SettingsDep,
    session: SessionDep,
    response: Response,
) -> Token:
    user = session.scalars(select(UserDB).where(UserDB.email == data.email)).first()
    if not user:
        myctx.dummy_verify()
        raise HTTPException(status_code=401, detail="Bad credentials")
    match data.type:
        case LoginType.PASSWORD:
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
            raise HTTPException(status_code=501, detail="Not implemented")

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
