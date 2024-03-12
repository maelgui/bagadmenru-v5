#!/usr/bin/env python3
import logging
import sys

import requests

try:
    res = requests.head("http://localhost:8000", timeout=3)
    res.raise_for_status()
except requests.RequestException as exc:
    logging.error("Healthcheck error: %s", exc)
    sys.exit(1)
else:
    sys.exit(0)
