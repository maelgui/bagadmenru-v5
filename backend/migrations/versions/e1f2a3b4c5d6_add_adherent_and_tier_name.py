"""add adherent and tier_name to helloasso memberships

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-09-07 23:55:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e1f2a3b4c5d6"
down_revision = "d0e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "helloasso_memberships",
        sa.Column("adherent_first_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "helloasso_memberships",
        sa.Column("adherent_last_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "helloasso_memberships",
        sa.Column("tier_name", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("helloasso_memberships", "tier_name")
    op.drop_column("helloasso_memberships", "adherent_last_name")
    op.drop_column("helloasso_memberships", "adherent_first_name")
