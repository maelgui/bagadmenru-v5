"""Helpers for random, server-side action tokens.

These replace the previous itsdangerous ``URLSafeTimedSerializer`` tokens. The
token handed out in an email link is now an opaque random secret; only its
SHA-256 hash is stored (see ``models.action_token.ActionTokenDB``), so a
database leak cannot be used to replay a link.

Issue a token with :func:`create_action_token` (returns the raw token to embed
in the email), and validate/consume it with :func:`consume_action_token`.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from bbe2.models.action_token import ActionTokenDB, ActionTokenValue


def hash_action_token(raw_token: str) -> str:
    """Return the SHA-256 hex digest of a raw action token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_action_token() -> str:
    """Generate a new opaque action-token secret."""
    return secrets.token_urlsafe(48)


def _as_aware(value: datetime) -> datetime:
    """Treat naive datetimes (from some drivers) as UTC for safe comparison."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def create_action_token(
    db: DbSession,
    token_type: ActionTokenValue,
    payload: dict[str, Any],
    expires_in: Optional[int] = None,
) -> str:
    """Create an action-token row and return the raw token.

    The raw token is returned to the caller (to embed in an email link) but only
    its hash is persisted. ``expires_in`` defaults to the type's ``max_age``.
    """
    raw_token = generate_action_token()
    now = datetime.now(timezone.utc)
    max_age = token_type.max_age if expires_in is None else expires_in
    row = ActionTokenDB(
        token_hash=hash_action_token(raw_token),
        token_type=token_type.value,
        payload=payload,
        created_at=now,
        expires_at=now + timedelta(seconds=max_age),
    )
    db.add(row)
    db.flush()
    return raw_token


def consume_action_token(
    db: DbSession,
    raw_token: str,
    token_type: ActionTokenValue,
) -> Optional[dict[str, Any]]:
    """Validate a raw token for a given type and return its payload, or None.

    Rejects unknown, wrong-type, expired, revoked, and already-used tokens. For
    single-use token types (:pyattr:`ActionTokenValue.single_use`) the row's
    ``used_at`` is stamped so the token cannot be replayed.
    """
    row = db.scalars(
        select(ActionTokenDB).where(
            ActionTokenDB.token_hash == hash_action_token(raw_token)
        )
    ).first()

    if row is None:
        return None
    # Guard against a hash collision across types by matching the type too.
    if row.token_type != token_type.value:
        return None

    now = datetime.now(timezone.utc)
    if row.revoked_at is not None:
        return None
    if row.used_at is not None:
        return None
    if _as_aware(row.expires_at) <= now:
        return None

    if token_type.single_use:
        row.used_at = now
        db.flush()

    return dict(row.payload)
