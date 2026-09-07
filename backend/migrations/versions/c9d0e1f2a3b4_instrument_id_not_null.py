"""Make users.instrument_id non-nullable

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-09-07 13:40:00.000000

Every member belongs to an instrument (pupitre); the application layer already
treats ``instrument_id`` as required (``ProfileCreate``). This aligns the schema
with that invariant.

Guarded upgrade: if any existing row still has a NULL ``instrument_id`` the
migration aborts with a clear error rather than inventing an arbitrary value,
so the inconsistency is fixed deliberately before enforcing the constraint.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    orphan_count = conn.execute(
        sa.text("SELECT COUNT(*) FROM users WHERE instrument_id IS NULL")
    ).scalar_one()
    if orphan_count:
        raise RuntimeError(
            f"Cannot make users.instrument_id NOT NULL: {orphan_count} user(s) "
            "have a NULL instrument_id. Assign an instrument to those users "
            "before running this migration."
        )

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "instrument_id",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "instrument_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
