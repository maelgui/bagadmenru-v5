import json
import logging
import os
import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from bbe2.api.v1.api import api_router
from bbe2.scheduler import scheduler

logging.basicConfig(level=logging.INFO)


tags_metadata = [
    {
        "name": "users",
        "description": "Operations with users. The **login** logic is also here.",
    },
]

sentry_sdk.init(
    dsn="https://de1e28317ac8c43ef670553301bdb84d@o1008469.ingest.us.sentry.io/4508480010518528",
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for tracing.
    traces_sample_rate=1.0,
    _experiments={
        # Set continuous_profiling_auto_start to True
        # to automatically start the profiler on when
        # possible.
        "continuous_profiling_auto_start": True,
    },
    environment=os.environ.get("ENVIRONMENT", "development"),
)


@asynccontextmanager
# pylint: disable=unused-argument
async def lifespan(fapp: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    # title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
    # swagger_ui_init_oauth={
    #     "clientId": settings.swagger_client_id,
    #     "appName": "Doc Tools",
    #     "usePkceWithAuthorizationCodeGrant": True,
    #     "scopes": "openid email",
    # },
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SECRET_KEY", "dev"))

# CORS - required because frontend (beta.bagadmenru.bzh) calls API on different subdomain
_cors_origins_raw = os.environ.get("CORS_ALLOWED_ORIGINS", "[]")
_cors_origins = json.loads(_cors_origins_raw) if _cors_origins_raw else []
_cors_origin_regex = os.environ.get("CORS_ALLOWED_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/api/v1/health")
async def health():
    return {"status": "healthy"}
