"""Helpers for per-member API keys.

An API key is an opaque random secret handed out once at creation; only its
SHA-256 hash is stored (see :class:`bbe2.models.api_key.ApiKeyDB`), mirroring
the action-token design, so a database leak cannot be used to replay a key.

Issue a key with :func:`create_api_key` (returns the raw key to show the member
exactly once), and resolve an incoming key to its owner with
:func:`resolve_api_key`.
"""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from bbe2.models.api_key import ApiKeyDB

# Human-recognisable, greppable prefix on every raw key so a leaked secret is
# easy to attribute and to scan for in logs/repos.
API_KEY_PREFIX = "bmr_"
# Number of leading characters (including API_KEY_PREFIX) stored in clear as the
# non-secret display prefix.
_DISPLAY_PREFIX_LEN = 10


def hash_api_key(raw_key: str) -> str:
    """Return the SHA-256 hex digest of a raw API key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    """Generate a new opaque API-key secret with the recognisable prefix."""
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"


def create_api_key(
    db: DbSession,
    user_id: str,
    label: str,
    authorized_permissions: list[str],
) -> tuple[str, ApiKeyDB]:
    """Create an API-key row for ``user_id`` and return ``(raw_key, row)``.

    The raw key is returned to the caller (to show the member once) but only its
    hash is persisted. ``authorized_permissions`` is the subset of the owner's
    RBAC permissions ("action:resource") the key may exercise. The row is
    flushed so its generated columns are readable.
    """
    raw_key = generate_api_key()
    row = ApiKeyDB(
        key_hash=hash_api_key(raw_key),
        user_id=user_id,
        prefix=raw_key[:_DISPLAY_PREFIX_LEN],
        label=label,
        authorized_permissions=list(authorized_permissions),
    )
    db.add(row)
    db.flush()
    return raw_key, row


def resolve_api_key(db: DbSession, raw_key: str) -> Optional[ApiKeyDB]:
    """Return the owning key row for a valid raw key, or ``None``.

    Rejects unknown and revoked keys. On success, stamps ``last_used_at`` so a
    member can spot stale keys. The caller's session commits on a successful
    request, persisting the timestamp; a failed/rolled-back request simply
    leaves it unchanged.
    """
    if not raw_key:
        return None

    row = db.scalars(
        select(ApiKeyDB).where(ApiKeyDB.key_hash == hash_api_key(raw_key))
    ).first()

    if row is None:
        return None
    if row.revoked_at is not None:
        return None

    row.last_used_at = datetime.now(timezone.utc)
    db.flush()
    return row


def revoke_api_key(db: DbSession, user_id: str, key_hash: str) -> bool:
    """Revoke ``key_hash`` if it belongs to ``user_id`` (idempotent).

    Returns ``True`` if a matching, not-already-revoked key was revoked, else
    ``False`` (unknown key, wrong owner, or already revoked). Scoping the lookup
    to ``user_id`` ensures a member can only revoke their own keys.
    """
    row = db.scalars(
        select(ApiKeyDB).where(
            ApiKeyDB.key_hash == key_hash, ApiKeyDB.user_id == user_id
        )
    ).first()
    if row is None or row.revoked_at is not None:
        return False
    row.revoked_at = datetime.now(timezone.utc)
    db.flush()
    return True
