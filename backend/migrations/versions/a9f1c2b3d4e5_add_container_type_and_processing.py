"""add container type and processing columns

Revision ID: a9f1c2b3d4e5
Revises: f7a8b9c0d1e2
Create Date: 2026-10-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a9f1c2b3d4e5"
down_revision: Union[str, None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE fileorfoldertype ADD VALUE IF NOT EXISTS 'CONTAINER'")
    op.add_column(
        "files", sa.Column("source_format", sa.String(length=8), nullable=True)
    )
    op.add_column(
        "files", sa.Column("processing_status", sa.String(length=16), nullable=True)
    )
    op.add_column(
        "files",
        sa.Column("processing_failure_reason", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("files", "processing_failure_reason")
    op.drop_column("files", "processing_status")
    op.drop_column("files", "source_format")
