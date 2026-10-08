"""add file metadata (size, uploaded_by, modified_at, modified_by)

Revision ID: 538c953a050e
Revises: a9f1c2b3d4e5
Create Date: 2026-10-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "538c953a050e"
down_revision: Union[str, None] = "a9f1c2b3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("files", sa.Column("size", sa.Integer(), nullable=True))
    op.add_column("files", sa.Column("modified_at", sa.DateTime(), nullable=True))
    op.add_column(
        "files", sa.Column("uploaded_by", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "files", sa.Column("modified_by", sa.String(length=64), nullable=True)
    )
    op.create_foreign_key(
        "fk_files_uploaded_by_users",
        "files",
        "users",
        ["uploaded_by"],
        ["id"],
        ondelete="set null",
    )
    op.create_foreign_key(
        "fk_files_modified_by_users",
        "files",
        "users",
        ["modified_by"],
        ["id"],
        ondelete="set null",
    )


def downgrade() -> None:
    op.drop_constraint("fk_files_modified_by_users", "files", type_="foreignkey")
    op.drop_constraint("fk_files_uploaded_by_users", "files", type_="foreignkey")
    op.drop_column("files", "modified_by")
    op.drop_column("files", "uploaded_by")
    op.drop_column("files", "modified_at")
    op.drop_column("files", "size")
