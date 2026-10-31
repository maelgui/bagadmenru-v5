"""add audit_events

Revision ID: d4e5f6a7b8c9
Revises: c8d9e0f1a2b3
Create Date: 2026-10-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column(
            "at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column(
            "kind",
            sa.Enum("API_CALL", "PAGE_VIEW", "CLICK", name="auditkind"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=True),
        sa.Column("status", sa.SmallInteger(), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("correlation_id", sa.String(length=64), nullable=True),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column(
            "details", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="set null"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_audit_events_user_at", "audit_events", ["user_id", "at"], unique=False
    )
    op.create_index(
        "idx_audit_events_kind_at", "audit_events", ["kind", "at"], unique=False
    )
    op.create_index("idx_audit_events_at", "audit_events", ["at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_audit_events_at", table_name="audit_events")
    op.drop_index("idx_audit_events_kind_at", table_name="audit_events")
    op.drop_index("idx_audit_events_user_at", table_name="audit_events")
    op.drop_table("audit_events")
    sa.Enum(name="auditkind").drop(op.get_bind(), checkfirst=True)
