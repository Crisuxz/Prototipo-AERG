from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import RubricStatus
from app.models.mixins import enum_column, utcnow


class Rubric(Base):
    __tablename__ = "rubrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RubricStatus] = mapped_column(enum_column(RubricStatus), default=RubricStatus.DRAFT)
    version: Mapped[int] = mapped_column(default=1)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    criteria: Mapped[list["RubricCriterion"]] = relationship(
        back_populates="rubric",
        cascade="all, delete-orphan",
        order_by="RubricCriterion.order",
    )


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"
    __table_args__ = (UniqueConstraint("rubric_id", "order", name="uq_criterion_order_per_rubric"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    rubric_id: Mapped[int] = mapped_column(ForeignKey("rubrics.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[float] = mapped_column(Numeric(6, 2, asdecimal=False))
    order: Mapped[int] = mapped_column()

    rubric: Mapped[Rubric] = relationship(back_populates="criteria")
    levels: Mapped[list["PerformanceLevel"]] = relationship(
        back_populates="criterion",
        cascade="all, delete-orphan",
        order_by="PerformanceLevel.order",
    )


class PerformanceLevel(Base):
    __tablename__ = "performance_levels"
    __table_args__ = (UniqueConstraint("criterion_id", "order", name="uq_level_order_per_criterion"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    criterion_id: Mapped[int] = mapped_column(ForeignKey("rubric_criteria.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float] = mapped_column(Numeric(8, 2, asdecimal=False))
    order: Mapped[int] = mapped_column()

    criterion: Mapped[RubricCriterion] = relationship(back_populates="levels")
