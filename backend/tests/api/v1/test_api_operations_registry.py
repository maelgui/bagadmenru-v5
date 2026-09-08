"""Guard: every API-key operation id must be a real OpenAPI operation.

The API-key allowlist (``bbe2.utils.api_operations.API_KEY_OPERATIONS``) stores
OpenAPI operation ids as plain strings. A typo would silently make a key
unusable (its operation would never match a route). This test loads the app's
OpenAPI schema and asserts every allowlisted id exists.
"""

from bbe2.main import app
from bbe2.utils.api_operations import API_KEY_OPERATIONS


def test_api_key_operations_exist_in_openapi():
    operation_ids = {
        op.get("operationId")
        for methods in app.openapi()["paths"].values()
        for op in methods.values()
        if isinstance(op, dict) and op.get("operationId")
    }
    missing = set(API_KEY_OPERATIONS) - operation_ids
    assert not missing, f"Unknown API-key operation ids (not in OpenAPI): {missing}"
