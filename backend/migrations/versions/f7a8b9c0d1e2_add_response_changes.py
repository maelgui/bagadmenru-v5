"""Add response_changes audit table

Revision ID: f7a8b9c0d1e2
Revises: e4f5a6b7c8d9
Create Date: 2026-10-02 20:40:00.000000

Append-only log of RSVP state changes (from_value -> to_value) so staff can see
when a member switches their answer, in particular present -> absent. Rapid
back-and-forth within a short cooldown is coalesced by the application layer, so
this table only ever holds settled transitions.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "response_changes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_value", sa.Boolean(), nullable=True),
        sa.Column("to_value", sa.Boolean(), nullable=False),
        sa.Column("changed_at", sa.DateTime(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_response_changes_changed_at"),
        "response_changes",
        ["changed_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_changes_event_id"),
        "response_changes",
        ["event_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_changes_user_id"),
        "response_changes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_response_changes_user_id"), table_name="response_changes"
    )
    op.drop_index(
        op.f("ix_response_changes_event_id"), table_name="response_changes"
    )
    op.drop_index(
        op.f("ix_response_changes_changed_at"), table_name="response_changes"
    )
    op.drop_table("response_changes")
