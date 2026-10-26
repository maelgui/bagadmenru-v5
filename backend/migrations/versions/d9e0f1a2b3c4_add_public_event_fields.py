"""add public fields to events

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-26 15:30:00.000000

Adds to ``events`` what the public website needs to show an agenda:

- ``is_public`` opts an event into the public agenda (default false, so every
  existing event stays members-only).
- ``public_description`` is the visitor-facing text, kept apart from the
  members-only ``description``.
- ``location`` and ``start_time`` are optional for every event, public or not.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("events") as batch_op:
        batch_op.add_column(sa.Column("location", sa.String(length=100)))
        batch_op.add_column(sa.Column("start_time", sa.Time()))
        batch_op.add_column(
            sa.Column(
                "is_public",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.add_column(sa.Column("public_description", sa.String()))


def downgrade() -> None:
    with op.batch_alter_table("events") as batch_op:
        batch_op.drop_column("public_description")
        batch_op.drop_column("is_public")
        batch_op.drop_column("start_time")
        batch_op.drop_column("location")
