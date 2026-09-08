"""add adherent_email to helloasso memberships

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-08 10:05:00.000000

Adds ``adherent_email`` — the adherent's own email, taken from the HelloAsso
item's "Email" custom field. This is the address to contact the adherent on
(unlike ``payer_email``, which may be a parent), and is what the reconciliation
UI uses to prefill an invitation for an unlinked order.

Backfill: existing rows keep their full ``raw_payload``, so we recover the
custom-field email from it using the same matching rule as ingestion
(case-insensitive field name "Email", answer must contain "@").
"""

from typing import Optional, Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import column, table

# revision identifiers, used by Alembic.
revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _custom_field_email(payload: dict, item_id: int) -> Optional[str]:
    """Recover the adherent Email custom field for ``item_id`` from a payload.

    Mirrors ``HelloAssoItem.custom_field_email``: matches the field named
    "Email" case-insensitively and only accepts an answer that looks like an
    email (contains "@").
    """
    if not isinstance(payload, dict):
        return None
    data = payload.get("data") or {}
    for item in data.get("items") or []:
        if item.get("id") != item_id:
            continue
        for field in item.get("customFields") or []:
            if (field.get("name") or "").strip().lower() == "email":
                answer = (field.get("answer") or "").strip()
                if "@" in answer:
                    return answer
    return None


def upgrade() -> None:
    op.add_column(
        "helloasso_memberships",
        sa.Column("adherent_email", sa.String(length=255), nullable=True),
    )

    # Backfill from the retained raw payload so existing unlinked rows also get
    # the adherent email, not just newly-ingested ones.
    memberships = table(
        "helloasso_memberships",
        column("id", sa.String),
        column("helloasso_item_id", sa.BigInteger),
        column("adherent_email", sa.String),
        column("raw_payload", sa.JSON),
    )
    conn = op.get_bind()
    rows = conn.execute(
        sa.select(
            memberships.c.id,
            memberships.c.helloasso_item_id,
            memberships.c.raw_payload,
        )
    ).fetchall()
    for row_id, item_id, raw_payload in rows:
        email = _custom_field_email(raw_payload, item_id)
        if email:
            conn.execute(
                memberships.update()
                .where(memberships.c.id == row_id)
                .values(adherent_email=email)
            )


def downgrade() -> None:
    op.drop_column("helloasso_memberships", "adherent_email")
