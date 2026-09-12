"""Export the FastAPI OpenAPI schema to stdout without running a server.

Used by CI (and usable locally) to regenerate the TypeScript client without
booting the docker-compose stack:

    ENVIRONMENT=ci SECRET_KEY=x poetry run python scripts/export_openapi.py > openapi.json

The output is identical to what a running backend serves at /openapi.json.
"""

import json

from bbe2.main import app

if __name__ == "__main__":
    print(json.dumps(app.openapi(), indent=2, sort_keys=False))
