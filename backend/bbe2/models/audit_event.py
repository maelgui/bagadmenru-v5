"""Audit trail: one row per user action.

Three kinds of rows share the table (see ``schemas.audit.AuditKind``): every
API request handled by the backend (written by the HTTP middleware), and the
page views and clicks the frontend reports in batches. A mutation is an
API_CALL whose method is not GET; readers filter on ``method``.

No request body is ever stored: ``path`` carries the concrete URL (with
secret-looking path parameters redacted) and ``name`` the route pattern, so
the row says *what* was done to *which* resource without copying its content.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from bbe2.models.base import Base
from bbe2.schemas.audit import AuditKind

if TYPE_CHECKING:
    from bbe2.models.user import UserDB


class AuditEventDB(Base):
    __tablename__ = "audit_events"

    # BigInteger: this table grows by every request. SQLite only autoincrements
    # a plain INTEGER primary key, hence the variant for the unit-test DB.
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True
    )
    # pylint: disable=not-callable
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="set null"), nullable=True
    )
    kind: Mapped[AuditKind] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    path: Mapped[str] = mapped_column(Text, nullable=False)
    method: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    status: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )

    user: Mapped[Optional["UserDB"]] = relationship(lazy="noload")

    __table_args__ = (
        Index("idx_audit_events_user_at", "user_id", "at"),
        Index("idx_audit_events_kind_at", "kind", "at"),
        Index("idx_audit_events_at", "at"),
    )
