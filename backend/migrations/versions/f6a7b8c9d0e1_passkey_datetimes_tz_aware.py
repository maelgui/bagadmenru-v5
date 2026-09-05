"""make passkey datetimes timezone-aware

The passkeys.last_use_at and passkeys.created_at columns were created as
TIMESTAMP WITHOUT TIME ZONE. Values are written in UTC but serialized to the
API without a timezone marker, so the frontend interpreted them as local time
(showing a CEST/CET offset on "last used"). Convert both columns to
timestamptz, treating the existing naive values as UTC (which is how they were
written).

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-05 14:35:00.000000

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing values were stored in UTC; reinterpret them as UTC so the
    # instant is preserved when the column gains a timezone.
    op.execute(
        "ALTER TABLE passkeys "
        "ALTER COLUMN last_use_at TYPE timestamptz "
        "USING last_use_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE passkeys "
        "ALTER COLUMN created_at TYPE timestamptz "
        "USING created_at AT TIME ZONE 'UTC'"
    )


def downgrade() -> None:
    # Drop the timezone, storing the UTC wall-clock time as a naive value
    # (the inverse of the upgrade).
    op.execute(
        "ALTER TABLE passkeys "
        "ALTER COLUMN last_use_at TYPE timestamp "
        "USING last_use_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE passkeys "
        "ALTER COLUMN created_at TYPE timestamp "
        "USING created_at AT TIME ZONE 'UTC'"
    )
