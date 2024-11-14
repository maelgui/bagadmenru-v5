#!/usr/bin/env python3
import logging
import sys

import httpx

try:
    res = httpx.get("http://localhost:8000", timeout=3)
    res.raise_for_status()
except httpx.HTTPError as exc:
    logging.error("Healthcheck error: %s", exc)
    sys.exit(1)
else:
    sys.exit(0)
