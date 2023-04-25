import requests
from fastapi import Depends, FastAPI, Security

from bbe2.api.v1.api import api_router
from bbe2.config import settings
from bbe2.database import Base, engine
from bbe2.dependencies.auth import get_current_user, oauth2_scheme

Base.metadata.create_all(bind=engine)

tags_metadata = [
    {
        "name": "users",
        "description": "Operations with users. The **login** logic is also here.",
    },
]

app = FastAPI(
    # title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
    swagger_ui_init_oauth = {
        "clientId": settings.swagger_client_id,
        "appName": "Doc Tools",
        "usePkceWithAuthorizationCodeGrant": True,
        "scopes": "openid email",
    },
    openapi_tags=tags_metadata,
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def hello():
    return {"status": "OK"}
