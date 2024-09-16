import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from bbe2.api.v1.api import api_router
from bbe2.config import settings
from bbe2.database import Base, engine
from bbe2.fixtures import init_fixtures

logging.basicConfig(level=logging.INFO)


def init_db():
    Base.metadata.create_all(bind=engine)
    init_fixtures()


init_db()

tags_metadata = [
    {
        "name": "users",
        "description": "Operations with users. The **login** logic is also here.",
    },
]

app = FastAPI(
    # title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
    swagger_ui_init_oauth={
        "clientId": settings.swagger_client_id,
        "appName": "Doc Tools",
        "usePkceWithAuthorizationCodeGrant": True,
        "scopes": "openid email",
    },
    openapi_tags=tags_metadata,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_origin_regex=settings.cors_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=True,
    domain="beta.bagadmenru.bzh",
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    # time.sleep(random.randint(0, 3))
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def hello():
    return {"status": "OK"}
