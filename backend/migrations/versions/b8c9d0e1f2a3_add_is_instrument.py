"""Add is_instrument flag to groups

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-06 10:30:00.000000

Adds a boolean ``is_instrument`` column to ``groups`` so the public
self-service signup form can offer only instrument groups as the invitee's
"instrument" choice. As a best-effort retrofit, existing groups referenced by a
user's ``instrument_id`` are flagged as instruments.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "groups",
        sa.Column(
            "is_instrument", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )

    # Retrofit: any group already used as a user's instrument is an instrument.
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE groups SET is_instrument = true WHERE id IN ("
            "  SELECT DISTINCT instrument_id FROM users "
            "  WHERE instrument_id IS NOT NULL"
            ")"
        )
    )


def downgrade() -> None:
    op.drop_column("groups", "is_instrument")
