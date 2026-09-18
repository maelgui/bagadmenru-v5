"""Make responses.date nullable

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-09-18 16:35:00.000000

Responses backfilled from the previous site only carry a yes/no value; the
actual answer date is unknown. NULL honestly encodes "date unknown" instead of
fabricating a timestamp that would skew the average-response-time statistics
(SQL ``AVG`` simply ignores NULL rows). The API keeps setting a date on every
response it creates, so NULL can only come from the backfill.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("responses") as batch_op:
        batch_op.alter_column(
            "date",
            existing_type=sa.DateTime(),
            nullable=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    null_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM responses WHERE date IS NULL")
    ).scalar_one()
    if null_count:
        raise RuntimeError(
            f"Cannot make responses.date NOT NULL: {null_count} response(s) "
            "have a NULL date (backfilled from the previous site). Set a date "
            "on those rows before downgrading."
        )

    with op.batch_alter_table("responses") as batch_op:
        batch_op.alter_column(
            "date",
            existing_type=sa.DateTime(),
            nullable=False,
        )
