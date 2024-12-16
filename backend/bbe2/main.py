import logging
import time

from fastapi import FastAPI, Request

from bbe2.api.v1.api import api_router
import sentry_sdk

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
)

app = FastAPI(
    # title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
    # swagger_ui_init_oauth={
    #     "clientId": settings.swagger_client_id,
    #     "appName": "Doc Tools",
    #     "usePkceWithAuthorizationCodeGrant": True,
    #     "scopes": "openid email",
    # },
    openapi_tags=tags_metadata,
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
