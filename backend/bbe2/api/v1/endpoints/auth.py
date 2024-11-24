import time
from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import select, update

from bbe2.dependencies import SessionDep, SettingsDep
from bbe2.models.user import User
from bbe2.schemas.auth import (
    JwtPayload,
    LoginData,
    LoginType,
    ResetPasswordRequest,
    Token,
)
from bbe2.utils.auth import myctx

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
    time.sleep(3)
    user = session.scalars(select(User).where(User.email == data.email)).first()
    if not user:
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
                    update(User).where(User.id == user.id).values(password=new_hash)
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
def reset_password(body: ResetPasswordRequest):
    return {}


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {}
