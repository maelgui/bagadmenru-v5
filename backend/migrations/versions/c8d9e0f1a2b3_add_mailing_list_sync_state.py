"""add mailing list sync state

Revision ID: c8d9e0f1a2b3
Revises: b7c8d9e0f1a2
Create Date: 2026-10-16 09:00:00.000000

Adds two columns to ``groups`` so the UI can show the result of the last
mailing-list synchronisation (run by the nightly cron or on demand):

- ``mailing_list_synced_at`` is the timestamp of the last successful sync.
- ``mailing_list_sync_error`` holds the error message of the last failed sync,
  or NULL when the last run succeeded.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c8d9e0f1a2b3"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("groups") as batch_op:
        batch_op.add_column(
            sa.Column(
                "mailing_list_synced_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column("mailing_list_sync_error", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("groups") as batch_op:
        batch_op.drop_column("mailing_list_sync_error")
        batch_op.drop_column("mailing_list_synced_at")
