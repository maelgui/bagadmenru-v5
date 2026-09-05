"""Migration tests that run against a real PostgreSQL database.

Unit tests use SQLite with ``Base.metadata.create_all()`` and never exercise
Alembic, so a broken migration would pass CI unnoticed. These tests instead
run the migrations exactly as production does — on PostgreSQL — to catch:

- SQL that is invalid on Postgres (e.g. ``ALTER COLUMN ... TYPE timestamptz``),
- downgrades that don't round-trip,
- drift between the ORM models and the migration chain.

They require a Postgres instance reachable via the ``MIGRATION_TEST_DATABASE_URL``
environment variable and are skipped otherwise, so the SQLite unit-test run is
unaffected.

Locally:
    docker compose up -d db
    MIGRATION_TEST_DATABASE_URL=postgresql+psycopg://postgres:kcwRzG4coiE@localhost:5432/postgres \
        poetry run pytest -m migrations
"""

import os

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text

from bbe2.models.base import Base

pytestmark = pytest.mark.migrations

DATABASE_URL = os.environ.get("MIGRATION_TEST_DATABASE_URL")

skip_without_pg = pytest.mark.skipif(
    not DATABASE_URL,
    reason="MIGRATION_TEST_DATABASE_URL not set (requires a PostgreSQL instance)",
)


def _alembic_config(url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture()
def clean_engine():
    """A Postgres engine backed by a pristine, empty ``public`` schema."""
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    yield engine
    engine.dispose()


@skip_without_pg
def test_upgrade_head_from_empty(clean_engine):
    """`alembic upgrade head` succeeds on a fresh database."""
    cfg = _alembic_config(DATABASE_URL)
    command.upgrade(cfg, "head")

    # Sanity: a table we know about exists after migrating.
    tables = inspect(clean_engine).get_table_names()
    assert "passkeys" in tables


@skip_without_pg
def test_downgrade_then_upgrade_round_trips(clean_engine):  # noqa: ARG001
    """Full downgrade to base and back to head works (downgrades are valid)."""
    cfg = _alembic_config(DATABASE_URL)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@skip_without_pg
def test_passkey_datetimes_are_timezone_aware(clean_engine):
    """Regression: passkeys datetime columns must be timestamptz.

    A naive column serialized without a timezone marker made the frontend
    render "last used" with a local-time offset. Guard against a relapse.
    """
    cfg = _alembic_config(DATABASE_URL)
    command.upgrade(cfg, "head")

    with clean_engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT column_name, data_type "
                "FROM information_schema.columns "
                "WHERE table_name = 'passkeys' "
                "AND column_name IN ('last_use_at', 'created_at')"
            )
        ).all()

    types = {name: dtype for name, dtype in rows}
    assert types.get("last_use_at") == "timestamp with time zone", types
    assert types.get("created_at") == "timestamp with time zone", types


@skip_without_pg
def test_no_drift_between_models_and_migrations(clean_engine):
    """After `upgrade head`, the ORM metadata matches the DB schema.

    If a model changed without a matching migration (or vice versa), Alembic's
    autogenerate diff is non-empty and this test fails.
    """
    cfg = _alembic_config(DATABASE_URL)
    command.upgrade(cfg, "head")

    with clean_engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        diff = compare_metadata(ctx, Base.metadata)

    assert diff == [], f"Model/migration drift detected: {diff}"
