"""add passkey origin

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-10-26 09:30:00.000000

Adds ``passkeys.origin``: which surface created the credential (settings
page, post-invitation enrolment, explicit offer in the sign-in flow, or the
silent conditional-create upgrade). Nullable: passkeys registered before this
column existed keep NULL, which the API and metrics report as unknown.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, None] = "c8d9e0f1a2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ORIGIN = sa.Enum(
    "SETTINGS", "INVITATION", "AUTH_PROMPT", "AUTH_SILENT", name="passkeyorigin"
)


def upgrade() -> None:
    ORIGIN.create(op.get_bind(), checkfirst=True)
    with op.batch_alter_table("passkeys") as batch_op:
        batch_op.add_column(sa.Column("origin", ORIGIN, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("passkeys") as batch_op:
        batch_op.drop_column("origin")
    ORIGIN.drop(op.get_bind(), checkfirst=True)
