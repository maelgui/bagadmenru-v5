"""Migration tests that run against a real PostgreSQL database.

Unit tests use SQLite with ``Base.metadata.create_all()`` and never exercise
Alembic, so a broken migration would pass CI unnoticed. These tests instead
run the migrations exactly as production does — on PostgreSQL — to catch:

- SQL that is invalid on Postgres (e.g. ``ALTER COLUMN ... TYPE timestamptz``),
- downgrades that don't round-trip,
- drift between the ORM models and the migration chain.

They require a Postgres instance reachable via the ``DATABASE_URL``
environment variable and are skipped otherwise, so the SQLite unit-test run
(which never sets ``DATABASE_URL``) is unaffected.

Locally:
    docker compose up -d db
    DATABASE_URL=postgresql+psycopg://postgres:kcwRzG4coiE@localhost:5432/postgres \
        poetry run pytest -m migrations
"""

import os

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text

from bbe2.models.base import Base

DATABASE_URL = os.environ.get("DATABASE_URL")


def test_single_head_revision():
    """The migration chain must have exactly one head.

    When two Git branches each add a migration with the same
    ``down_revision`` and both get merged, the chain forks into two heads.
    ``alembic upgrade head`` then refuses to run ("Multiple head revisions
    are present"), which otherwise only surfaces at deploy time.

    This check reads the migration files only — it needs no database, so it
    is NOT marked ``migrations`` and runs (and fails) in the plain unit-test
    job and locally, catching a divergent chain before it ever reaches CI's
    PostgreSQL job or a deployment.
    """
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    heads = script.get_heads()
    assert len(heads) == 1, (
        f"Multiple migration heads detected: {heads}. "
        f"Resolve with `alembic merge {' '.join(heads)}` or rebase one "
        f"migration's down_revision onto the other."
    )


# Tests decorated with ``@skip_without_pg`` need a real PostgreSQL instance:
# they carry the ``migrations`` marker (so CI's dedicated PG job selects them
# via ``-m migrations`` and the SQLite job excludes them via ``-m "not
# migrations"``) and are skipped when ``DATABASE_URL`` is unset (local runs).
# ``test_single_head_revision`` deliberately gets neither: it reads the
# migration files only, so it runs in every job and locally.
def skip_without_pg(func):
    func = pytest.mark.migrations(func)
    func = pytest.mark.skipif(
        not DATABASE_URL,
        reason="DATABASE_URL not set (requires a PostgreSQL instance)",
    )(func)
    return func


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
