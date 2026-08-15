"""drop campaign date columns

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2025-01-15 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Intentionally destructive: the v1 date guesses are dropped without
    # backfill. The v2 design derives the campaign date range from linked
    # events instead.
    op.drop_column("campaigns", "start_date")
    op.drop_column("campaigns", "end_date")


def downgrade() -> None:
    # Re-add start_date with a temporary server default so the NOT NULL
    # constraint can be satisfied on populated tables, then clear the default.
    op.add_column(
        "campaigns",
        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False,
            server_default=sa.func.current_date(),
        ),
    )
    op.add_column("campaigns", sa.Column("end_date", sa.Date(), nullable=True))
    op.alter_column("campaigns", "start_date", server_default=None)
