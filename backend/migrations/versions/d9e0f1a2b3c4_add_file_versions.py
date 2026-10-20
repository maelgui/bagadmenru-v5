"""add file versions

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-20 15:00:00.000000

Moves file content out of ``files`` into ``file_versions``, one row per
uploaded content. ``files.current_version_id`` points at the served one and
``files.storage_id`` is the stable UUID new version keys are derived from
(``files/<storage_id>-v<number>``).

Existing content becomes version 1 under its current key, attributed to the
file's creator. ``storage_id`` reuses the UUID of the existing ``files/<uuid>``
key, so later versions share its prefix in the bucket.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "file_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("file_key", sa.String(length=128), nullable=False),
        sa.Column("size", sa.Integer(), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("uploaded_by", sa.String(), nullable=True),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("purged_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="cascade"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="set null"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_id", "number", name="file_version_unique_number"),
    )
    op.add_column("files", sa.Column("storage_id", sa.String(length=36), nullable=True))
    op.add_column("files", sa.Column("current_version_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("files_storage_id_key", "files", ["storage_id"])
    op.create_foreign_key(
        "files_current_version_id_fkey",
        "files",
        "file_versions",
        ["current_version_id"],
        ["id"],
        ondelete="set null",
    )

    op.execute(
        """
        UPDATE files
        SET storage_id = CASE
            WHEN file_key ~ '^files/[0-9a-f-]{36}$' THEN substring(file_key from 7)
            ELSE gen_random_uuid()::text
        END
        WHERE type <> 'DIRECTORY'
        """
    )
    op.execute(
        """
        INSERT INTO file_versions (file_id, number, file_key, size, uploaded_at, uploaded_by)
        SELECT id, 1, file_key, size, uploaded_at AT TIME ZONE 'UTC', uploaded_by
        FROM files
        WHERE file_key IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE files
        SET current_version_id = file_versions.id
        FROM file_versions
        WHERE file_versions.file_id = files.id
        """
    )

    op.drop_column("files", "file_key")
    op.drop_column("files", "size")


def downgrade() -> None:
    op.add_column("files", sa.Column("size", sa.Integer(), nullable=True))
    op.add_column("files", sa.Column("file_key", sa.String(length=128), nullable=True))
    op.execute(
        """
        UPDATE files
        SET file_key = file_versions.file_key, size = file_versions.size
        FROM file_versions
        WHERE file_versions.id = files.current_version_id
        """
    )
    op.drop_constraint("files_current_version_id_fkey", "files", type_="foreignkey")
    op.drop_constraint("files_storage_id_key", "files", type_="unique")
    op.drop_column("files", "current_version_id")
    op.drop_column("files", "storage_id")
    op.drop_table("file_versions")
