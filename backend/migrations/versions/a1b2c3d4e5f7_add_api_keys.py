"""add api_keys and merge heads

Creates the per-member ``api_keys`` table and, at the same time, merges the two
existing migration heads (``f2a3b4c5d6e7`` and ``f6a7b8c9d0e1``) into a single
head so the history stays linear from here on.

Revision ID: a1b2c3d4e5f7
Revises: f2a3b4c5d6e7, f6a7b8c9d0e1
Create Date: 2026-09-08 23:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f7"
down_revision = ("f2a3b4c5d6e7", "f6a7b8c9d0e1")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("prefix", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=64), nullable=False),
        sa.Column("authorized_operations", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("key_hash"),
    )
    op.create_index(
        op.f("ix_api_keys_user_id"),
        "api_keys",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_api_keys_user_id"), table_name="api_keys")
    op.drop_table("api_keys")
