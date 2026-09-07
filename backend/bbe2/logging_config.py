"""Structured JSON logging for the backend.

Emits one JSON object per log line (JSON Lines / NDJSON) so logs can be
ingested and queried by log aggregators (Loki, CloudWatch, Datadog, ...)
without fragile regex parsing.

Design goals:
- No third-party dependency: built on the stdlib ``logging`` module.
- Every record carries the request's correlation ID when one is set (see
  :mod:`bbe2.utils.correlation`), so a single request can be traced across
  the API, the scheduler, and the email/push services.
- ``extra={...}`` fields passed to a logger call are merged into the JSON
  object, so callers can attach structured context
  (e.g. ``logger.info("sent", extra={"user_id": 42})``).
- Exceptions are rendered as a ``exception`` field with the full traceback.

Call :func:`setup_logging` once, as early as possible during app startup.
"""

import datetime as _dt
import json
import logging
import os
from typing import Any, Optional

from bbe2.utils.correlation import get_correlation_id

# Attributes present on every ``logging.LogRecord``. Anything *not* in this set
# is treated as caller-supplied structured context (passed via ``extra=``) and
# is merged into the JSON output.
_RESERVED_LOG_RECORD_ATTRS = frozenset(
    {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "thread",
        "threadName",
        "taskName",
    }
)


class JsonFormatter(logging.Formatter):
    """Render a log record as a single JSON line."""

    def __init__(self, *, service: str, environment: str) -> None:
        super().__init__()
        self._service = service
        self._environment = environment

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": _dt.datetime.fromtimestamp(
                record.created, tz=_dt.timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self._service,
            "environment": self._environment,
        }

        # Source location - cheap and invaluable when triaging.
        payload["module"] = record.module
        payload["function"] = record.funcName
        payload["line"] = record.lineno

        correlation_id = get_correlation_id()
        if correlation_id:
            payload["correlation_id"] = correlation_id

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        # Merge any structured context passed via ``extra=``.
        for key, value in record.__dict__.items():
            if key not in _RESERVED_LOG_RECORD_ATTRS and not key.startswith("_"):
                payload[key] = _make_json_safe(value)

        return json.dumps(payload, default=_make_json_safe, ensure_ascii=False)


def _make_json_safe(value: Any) -> Any:
    """Best-effort conversion of arbitrary values to JSON-serialisable ones."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [_make_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _make_json_safe(v) for k, v in value.items()}
    return str(value)


def _resolve_level(explicit: Optional[str]) -> int:
    """Pick the log level from an explicit arg or the LOG_LEVEL env var."""
    name = (explicit or os.environ.get("LOG_LEVEL") or "INFO").upper()
    level = logging.getLevelName(name)
    return level if isinstance(level, int) else logging.INFO


def setup_logging(level: Optional[str] = None) -> None:
    """Configure root and library loggers to emit structured JSON.

    Idempotent: safe to call more than once (e.g. under ``--reload``).
    """
    service = os.environ.get("SERVICE_NAME", "bbe2-backend")
    environment = os.environ.get("ENVIRONMENT", "development")

    formatter = JsonFormatter(service=service, environment=environment)

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(_resolve_level(level))
    # Replace any pre-existing handlers (e.g. from a prior basicConfig call)
    # so we do not emit each line twice or in a mix of formats.
    root.handlers = [handler]

    # Route the noisy framework loggers through our handler too. We clear their
    # own handlers and let propagation carry records up to root, so everything
    # comes out as JSON in one consistent stream.
    for logger_name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "sqlalchemy.engine",
        "apscheduler",
    ):
        lib_logger = logging.getLogger(logger_name)
        lib_logger.handlers = []
        lib_logger.propagate = True

    # uvicorn.access is very chatty and we emit our own access log line in the
    # HTTP middleware, so silence its default per-request line.
    logging.getLogger("uvicorn.access").disabled = True
