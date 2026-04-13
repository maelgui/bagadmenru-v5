"""Add default group with retrofit

Revision ID: a1b2c3d4e5f6
Revises: 61ce42e386ec
Create Date: 2026-04-13 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "61ce42e386ec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The name for the default group created by this migration.
# Adjust these to match your needs.
DEFAULT_GROUP_NAME = "Membres"
DEFAULT_GROUP_COLOR = "#3498db"


def upgrade() -> None:
    # 1. Add is_default column to groups table
    op.add_column(
        "groups",
        sa.Column(
            "is_default", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )

    # 2. Create the default group and assign all existing users to it
    conn = op.get_bind()

    # Insert the default group
    result = conn.execute(
        sa.text(
            "INSERT INTO groups (name, color, is_default) "
            "VALUES (:name, :color, true) RETURNING id"
        ),
        {"name": DEFAULT_GROUP_NAME, "color": DEFAULT_GROUP_COLOR},
    )
    default_group_id = result.scalar()

    # 2b. Assign ALL existing users to the default group
    conn.execute(
        sa.text(
            "INSERT INTO user_group_association_table (profile_id, group_id) "
            "SELECT id, :group_id FROM users "
            "WHERE id NOT IN ("
            "  SELECT profile_id FROM user_group_association_table "
            "  WHERE group_id = :group_id"
            ")"
        ),
        {"group_id": default_group_id},
    )


def downgrade() -> None:
    conn = op.get_bind()

    # Find the default group
    result = conn.execute(
        sa.text("SELECT id FROM groups WHERE is_default = true")
    )
    default_group_ids = [row[0] for row in result]

    for gid in default_group_ids:
        # Remove user associations
        conn.execute(
            sa.text(
                "DELETE FROM user_group_association_table WHERE group_id = :gid"
            ),
            {"gid": gid},
        )
        # Remove role associations
        conn.execute(
            sa.text(
                "DELETE FROM group_role_association_table WHERE group_id = :gid"
            ),
            {"gid": gid},
        )
        # Remove the group
        conn.execute(
            sa.text("DELETE FROM groups WHERE id = :gid"),
            {"gid": gid},
        )

    op.drop_column("groups", "is_default")
