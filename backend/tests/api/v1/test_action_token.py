"""Tests for the random DB-backed action tokens (utils.action_token)."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from bbe2.database import get_engine
from bbe2.models.action_token import ActionTokenDB, ActionTokenValue
from bbe2.utils.action_token import (
    consume_action_token,
    create_action_token,
    hash_action_token,
)

DATABASE_URL = "sqlite:///tests.sqlite?check_same_thread=false"
SEEDED_USER_ID = "a8e2d3249e9d997e"


def _session():
    engine = get_engine(DATABASE_URL)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def test_raw_token_is_never_stored(client):
    """Only the SHA-256 hash of the token is persisted, never the raw value."""
    with _session() as session:
        raw = create_action_token(
            session, ActionTokenValue.ResetPassword, {"user_id": SEEDED_USER_ID}
        )
        session.commit()
        row = session.scalars(
            select(ActionTokenDB).where(
                ActionTokenDB.token_hash == hash_action_token(raw)
            )
        ).one()
        assert row.token_hash != raw
        assert row.token_hash == hash_action_token(raw)
        assert row.payload == {"user_id": SEEDED_USER_ID}


def test_consume_returns_payload_for_valid_token(client):
    with _session() as session:
        raw = create_action_token(
            session, ActionTokenValue.ResetPassword, {"user_id": SEEDED_USER_ID}
        )
        session.commit()
        payload = consume_action_token(session, raw, ActionTokenValue.ResetPassword)
        assert payload == {"user_id": SEEDED_USER_ID}


def test_reset_password_token_is_single_use(client):
    """A password-reset token cannot be replayed after its first use."""
    with _session() as session:
        raw = create_action_token(
            session, ActionTokenValue.ResetPassword, {"user_id": SEEDED_USER_ID}
        )
        session.commit()

        first = consume_action_token(session, raw, ActionTokenValue.ResetPassword)
        session.commit()
        assert first is not None

        # Second attempt with the same token must be rejected.
        second = consume_action_token(session, raw, ActionTokenValue.ResetPassword)
        assert second is None


def test_rsvp_token_is_reusable(client):
    """The RSVP quick-answer link may be opened multiple times in its window."""
    with _session() as session:
        raw = create_action_token(
            session,
            ActionTokenValue.CreateResponseByToken,
            {"user_id": SEEDED_USER_ID, "event_id": 1},
        )
        session.commit()

        first = consume_action_token(
            session, raw, ActionTokenValue.CreateResponseByToken
        )
        session.commit()
        second = consume_action_token(
            session, raw, ActionTokenValue.CreateResponseByToken
        )
        assert first is not None
        assert second is not None


def test_consume_rejects_wrong_type(client):
    with _session() as session:
        raw = create_action_token(
            session, ActionTokenValue.Unsubscribe, {"user_id": SEEDED_USER_ID}
        )
        session.commit()
        # Same token, asked for as a different type -> rejected.
        assert (
            consume_action_token(session, raw, ActionTokenValue.CreateResponseByToken)
            is None
        )


def test_consume_rejects_unknown_token(client):
    with _session() as session:
        assert (
            consume_action_token(
                session, "does-not-exist", ActionTokenValue.ResetPassword
            )
            is None
        )


def test_consume_rejects_expired_token(client):
    with _session() as session:
        raw = create_action_token(
            session,
            ActionTokenValue.ResetPassword,
            {"user_id": SEEDED_USER_ID},
            expires_in=-1,  # already expired
        )
        session.commit()
        assert (
            consume_action_token(session, raw, ActionTokenValue.ResetPassword) is None
        )


def test_consume_rejects_revoked_token(client):
    with _session() as session:
        raw = create_action_token(
            session, ActionTokenValue.ResetPassword, {"user_id": SEEDED_USER_ID}
        )
        row = session.scalars(
            select(ActionTokenDB).where(
                ActionTokenDB.token_hash == hash_action_token(raw)
            )
        ).one()
        row.revoked_at = datetime.now(timezone.utc)
        session.commit()
        assert (
            consume_action_token(session, raw, ActionTokenValue.ResetPassword) is None
        )


def _make_token(session, token_hash, *, expires_at, used_at=None, revoked_at=None):
    session.add(
        ActionTokenDB(
            token_hash=token_hash,
            token_type=ActionTokenValue.ResetPassword.value,
            payload={},
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            expires_at=expires_at,
            used_at=used_at,
            revoked_at=revoked_at,
        )
    )


def test_purge_expired_action_tokens_removes_dead_tokens(client):
    """Purge deletes expired/used/revoked tokens, keeps live ones."""
    from datetime import timedelta

    from bbe2.utils.action_token import purge_expired_action_tokens

    now = datetime(2026, 6, 1, tzinfo=timezone.utc)
    past = now - timedelta(days=30)
    future = now + timedelta(days=30)

    with _session() as session:
        session.query(ActionTokenDB).delete()
        session.commit()

        _make_token(session, "expired", expires_at=past)
        _make_token(session, "used", expires_at=future, used_at=past)
        _make_token(session, "revoked", expires_at=future, revoked_at=past)
        _make_token(session, "live", expires_at=future)
        session.commit()

        deleted = purge_expired_action_tokens(session, grace_days=0, now=now)
        assert deleted == 3

        remaining = {
            row.token_hash for row in session.scalars(select(ActionTokenDB)).all()
        }
        assert remaining == {"live"}


def test_purge_expired_action_tokens_respects_grace_period(client):
    """A token dead less than grace_days is kept; older than that is removed."""
    from datetime import timedelta

    from bbe2.utils.action_token import purge_expired_action_tokens

    now = datetime(2026, 6, 1, tzinfo=timezone.utc)
    recently_expired = now - timedelta(days=3)
    long_expired = now - timedelta(days=10)

    with _session() as session:
        session.query(ActionTokenDB).delete()
        session.commit()

        _make_token(session, "recent", expires_at=recently_expired)
        _make_token(session, "old", expires_at=long_expired)
        session.commit()

        # 7-day grace: "recent" (3d) survives, "old" (10d) is purged.
        deleted = purge_expired_action_tokens(session, grace_days=7, now=now)
        assert deleted == 1

        remaining = {
            row.token_hash for row in session.scalars(select(ActionTokenDB)).all()
        }
        assert remaining == {"recent"}
