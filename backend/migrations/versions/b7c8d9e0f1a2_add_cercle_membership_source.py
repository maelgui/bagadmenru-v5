"""add cercle membership source and external id

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f8
Create Date: 2026-10-11 16:00:00.000000

Lets the ``helloasso_memberships`` table hold adhesions relayed by the Cercle
Montfortais alongside direct HelloAsso orders, keyed by a generic
``(source, source_id)`` pair instead of HelloAsso-specific id columns:

- ``source`` tags each row's origin ("helloasso" or "cercle"). Existing rows
  are backfilled to "helloasso".
- ``source_id`` is the source's own identifier, kept as text: the HelloAsso
  item id (backfilled from ``helloasso_item_id``) or the Cercle adhesion id
  (an opaque string such as "item:78901234"). Unique per source via
  ``uq_membership_source_id``.
- the HelloAsso-specific ``helloasso_order_id`` / ``helloasso_item_id`` columns
  are dropped; the full HelloAsso payload is still kept in ``raw_payload``.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the two new columns nullable first so we can backfill existing rows,
    # then make source_id NOT NULL and drop the per-source id columns.
    with op.batch_alter_table("helloasso_memberships") as batch_op:
        batch_op.add_column(
            sa.Column(
                "source",
                sa.String(length=16),
                nullable=False,
                server_default="helloasso",
            )
        )
        batch_op.add_column(
            sa.Column("source_id", sa.String(length=128), nullable=True)
        )

    # Existing rows are all HelloAsso: their source_id is the item id as text.
    op.execute(
        "UPDATE helloasso_memberships "
        "SET source_id = CAST(helloasso_item_id AS VARCHAR)"
    )

    with op.batch_alter_table("helloasso_memberships") as batch_op:
        batch_op.alter_column(
            "source_id", existing_type=sa.String(length=128), nullable=False
        )
        batch_op.create_index(
            batch_op.f("ix_helloasso_memberships_source"), ["source"]
        )
        batch_op.create_unique_constraint(
            "uq_membership_source_id", ["source", "source_id"]
        )
        batch_op.drop_column("helloasso_item_id")
        batch_op.drop_column("helloasso_order_id")


def downgrade() -> None:
    with op.batch_alter_table("helloasso_memberships") as batch_op:
        batch_op.add_column(
            sa.Column("helloasso_order_id", sa.BigInteger(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("helloasso_item_id", sa.BigInteger(), nullable=True)
        )

    # Restore the numeric item id for HelloAsso rows (Cercle rows had none).
    op.execute(
        "UPDATE helloasso_memberships "
        "SET helloasso_item_id = CAST(source_id AS BIGINT) "
        "WHERE source = 'helloasso'"
    )

    with op.batch_alter_table("helloasso_memberships") as batch_op:
        batch_op.create_index(
            batch_op.f("ix_helloasso_memberships_helloasso_order_id"),
            ["helloasso_order_id"],
        )
        batch_op.create_index(
            batch_op.f("ix_helloasso_memberships_helloasso_item_id"),
            ["helloasso_item_id"],
            unique=True,
        )
        batch_op.drop_constraint("uq_membership_source_id", type_="unique")
        batch_op.drop_index(batch_op.f("ix_helloasso_memberships_source"))
        batch_op.drop_column("source_id")
        batch_op.drop_column("source")
