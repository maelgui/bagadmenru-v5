"""add api_keys.auto_generated

Adds a flag distinguishing keys minted automatically by a UI flow (e.g. the
calendar-sync dialog) from keys deliberately created by the member in the
settings. Existing keys are backfilled to ``false`` (manual), which is the
safe default: at worst a pre-existing auto-minted key just misses its badge.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-09-16 12:10:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d3e4f5a6b7c8"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "api_keys",
        sa.Column(
            "auto_generated",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("api_keys", "auto_generated")
