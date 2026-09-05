import logging
import os
import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from bbe2 import __version__
from bbe2.api.v1.api import api_router
from bbe2.scheduler import scheduler
from bbe2.utils.correlation import (
    CORRELATION_ID_HEADER,
    resolve_correlation_id,
    set_correlation_id,
)

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
_session_secret = os.environ.get("SECRET_KEY")
if not _session_secret:
    raise RuntimeError(
        "SECRET_KEY environment variable is required "
        "(used to sign session cookies that hold WebAuthn challenges)."
    )
# The session cookie holds short-lived WebAuthn challenges. Harden it:
# - https_only: never send over plain HTTP (ingress already forces HTTPS/HSTS,
#   this is defence in depth).
# - same_site="lax": front and API share one origin now, so lax is enough and
#   keeps top-level navigations working.
# - max_age: challenges are consumed within seconds; no need for the 14-day
#   Starlette default.
app.add_middleware(
    SessionMiddleware,
    secret_key=_session_secret,
    https_only=True,
    same_site="lax",
    max_age=600,
)


@app.middleware("http")
async def add_correlation_id_header(request: Request, call_next):
    # Reuse a well-formed client-supplied ID, otherwise generate one.
    correlation_id = resolve_correlation_id(request.headers.get(CORRELATION_ID_HEADER))
    set_correlation_id(correlation_id)
    response = await call_next(request)
    response.headers[CORRELATION_ID_HEADER] = correlation_id
    return response


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    # time.sleep(random.randint(0, 3))
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


app.include_router(api_router, prefix="/api/v1")


class HealthResponse(BaseModel):
    status: str


class VersionResponse(BaseModel):
    version: str


@app.get("/")
async def hello() -> HealthResponse:
    return HealthResponse(status="OK")


@app.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="healthy")


@app.get("/api/v1/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    return VersionResponse(version=os.environ.get("APP_VERSION", "dev"))
