"""drop albums and photos tables

The albums/photos feature was removed (the ``AlbumDB`` and ``PhotoDB`` ORM
models, their API endpoints, and the frontend were deleted), but no migration
dropped the underlying tables. That left the database schema ahead of the ORM
metadata, which the migration drift test correctly flags. Drop the now-unused
``photos`` and ``albums`` tables (photos first, as it references albums).

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-05 18:55:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # photos references albums via a foreign key, so drop it first.
    op.drop_table("photos")
    op.drop_table("albums")


def downgrade() -> None:
    # Recreate the tables exactly as the first migration defined them, so a
    # downgrade round-trips back to the pre-removal schema.
    op.create_table(
        "albums",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=30), nullable=False),
        sa.Column("date", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("file_key", sa.String(length=128), nullable=False),
        sa.Column("is_root", sa.Boolean(), nullable=False),
        sa.Column("album_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["album_id"],
            ["albums.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
