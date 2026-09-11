"""add user_agent and last_used_at to push subscriptions

Also merges the two current migration heads (``e1f2a3b4c5d6`` and
``a1b2c3d4e5f7``) into a single head so history stays linear from here on.

Revision ID: b1c2d3e4f5a6
Revises: e1f2a3b4c5d6, a1b2c3d4e5f7
Create Date: 2026-09-11 11:30:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b1c2d3e4f5a6"
down_revision = ("e1f2a3b4c5d6", "a1b2c3d4e5f7")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "push_subscriptions",
        sa.Column("user_agent", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "push_subscriptions",
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("push_subscriptions", "last_used_at")
    op.drop_column("push_subscriptions", "user_agent")
