import logging
import os
import time
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.sessions import SessionMiddleware

from bbe2 import __version__
from bbe2.api.v1.api import api_router
from bbe2.config import Environment, get_environment
from bbe2.logging_config import setup_logging
from bbe2.scheduler import scheduler
from bbe2.services.email import EmailSendError
from bbe2.utils.correlation import (
    CORRELATION_ID_HEADER,
    resolve_correlation_id,
    set_correlation_id,
)

setup_logging()
logger = logging.getLogger("bbe2.access")


tags_metadata = [
    {
        "name": "users",
        "description": "Operations with users. The **login** logic is also here.",
    },
]

_SENTRY_DSN = "https://de1e28317ac8c43ef670553301bdb84d@o1008469.ingest.us.sentry.io/4508480010518528"  # pylint: disable=line-too-long  # noqa: E501

# Reporting is disabled in local development and CI so dev-only errors and
# traces are not shipped to Sentry. get_environment() reads os.environ directly
# (not get_settings()) because this runs at import time, before FastAPI's
# dependency injection - how tests mock settings - is available.
_ENVIRONMENT = get_environment()

if _ENVIRONMENT not in (Environment.DEVELOPMENT, Environment.CI):
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for tracing.
        traces_sample_rate=1.0,
        _experiments={
            # Set continuous_profiling_auto_start to True
            # to automatically start the profiler on when
            # possible.
            "continuous_profiling_auto_start": True,
        },
        environment=_ENVIRONMENT.value,
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
async def request_context(request: Request, call_next):
    # Establish the correlation ID first so every log line emitted while
    # handling this request (including the access line below) carries it.
    correlation_id = resolve_correlation_id(request.headers.get(CORRELATION_ID_HEADER))
    set_correlation_id(correlation_id)

    start_time = time.perf_counter()
    client_host = request.client.host if request.client else None
    base_extra = {
        "http_method": request.method,
        "http_path": request.url.path,
        "http_query": request.url.query or None,
        "client_ip": client_host,
        "user_agent": request.headers.get("user-agent"),
    }

    try:
        response = await call_next(request)
    except Exception:
        # Emit an access line for the failed request before re-raising so the
        # 500 is never invisible in the logs.
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.exception(
            "%s %s -> 500",
            request.method,
            request.url.path,
            extra={**base_extra, "http_status": 500, "duration_ms": duration_ms},
        )
        raise

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers[CORRELATION_ID_HEADER] = correlation_id
    response.headers["X-Process-Time"] = str(duration_ms / 1000)

    level = logging.WARNING if response.status_code >= 500 else logging.INFO
    logger.log(
        level,
        "%s %s -> %d (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        extra={
            **base_extra,
            "http_status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(EmailSendError)
async def email_send_error_handler(
    _request: Request, _exc: EmailSendError
) -> JSONResponse:
    """Return a clean 503 when an email could not be sent.

    Avoids leaking a bare 500 when the SMTP server is unreachable or rejects
    the message. The detail is user-facing (French) and intentionally generic.
    """
    return JSONResponse(
        status_code=503,
        content={
            "detail": (
                "L'envoi de l'email a échoué (service indisponible). "
                "Merci de réessayer dans quelques minutes."
            )
        },
    )


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
