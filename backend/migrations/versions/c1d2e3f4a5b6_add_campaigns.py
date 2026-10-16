"""add campaigns

Revision ID: c1d2e3f4a5b6
Revises: a1b2c3d4e5f8
Create Date: 2026-10-13 11:30:00.000000

"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "a1b2c3d4e5f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("events", sa.Column("campaign_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_events_campaign_id_campaigns",
        "events",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_events_campaign_id_campaigns", "events", type_="foreignkey"
    )
    op.drop_column("events", "campaign_id")
    op.drop_table("campaigns")
