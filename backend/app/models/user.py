from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import UserRole, UserSource
from app.models.mixins import enum_column, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    role: Mapped[UserRole] = mapped_column(enum_column(UserRole), default=UserRole.TEACHER)
    source: Mapped[UserSource] = mapped_column(enum_column(UserSource), default=UserSource.LOCAL)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
