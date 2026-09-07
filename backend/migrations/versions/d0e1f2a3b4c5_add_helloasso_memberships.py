"""add helloasso memberships

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-09-06 13:20:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "d0e1f2a3b4c5"
down_revision = "c9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "helloasso_memberships",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("helloasso_order_id", sa.BigInteger(), nullable=False),
        sa.Column("helloasso_item_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("payer_email", sa.String(length=255), nullable=True),
        sa.Column("payer_first_name", sa.String(length=255), nullable=True),
        sa.Column("payer_last_name", sa.String(length=255), nullable=True),
        sa.Column("tier_description", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_helloasso_memberships_id"),
        "helloasso_memberships",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_helloasso_memberships_helloasso_order_id"),
        "helloasso_memberships",
        ["helloasso_order_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_helloasso_memberships_helloasso_item_id"),
        "helloasso_memberships",
        ["helloasso_item_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_helloasso_memberships_user_id"),
        "helloasso_memberships",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_helloasso_memberships_user_id"),
        table_name="helloasso_memberships",
    )
    op.drop_index(
        op.f("ix_helloasso_memberships_helloasso_item_id"),
        table_name="helloasso_memberships",
    )
    op.drop_index(
        op.f("ix_helloasso_memberships_helloasso_order_id"),
        table_name="helloasso_memberships",
    )
    op.drop_index(
        op.f("ix_helloasso_memberships_id"),
        table_name="helloasso_memberships",
    )
    op.drop_table("helloasso_memberships")
