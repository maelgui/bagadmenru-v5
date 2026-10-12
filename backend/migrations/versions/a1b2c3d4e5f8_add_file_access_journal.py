"""add file_access journal

Revision ID: a1b2c3d4e5f8
Revises: 538c953a050e
Create Date: 2026-10-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f8"
down_revision: Union[str, None] = "538c953a050e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "file_access",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column(
            "action",
            sa.Enum("VIEW", "DOWNLOAD", name="fileaccessaction"),
            nullable=False,
        ),
        sa.Column(
            "at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="cascade"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="set null"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_file_access_file_at", "file_access", ["file_id", "at"], unique=False
    )
    op.create_index(
        "idx_file_access_user_at", "file_access", ["user_id", "at"], unique=False
    )
    op.create_index("idx_file_access_at", "file_access", ["at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_file_access_at", table_name="file_access")
    op.drop_index("idx_file_access_user_at", table_name="file_access")
    op.drop_index("idx_file_access_file_at", table_name="file_access")
    op.drop_table("file_access")
    sa.Enum(name="fileaccessaction").drop(op.get_bind(), checkfirst=True)
