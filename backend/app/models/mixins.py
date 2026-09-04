"""Utilidades compartidas por los modelos SQLAlchemy."""

from datetime import datetime, timezone

from sqlalchemy import Enum as SAEnum


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_column(enum_cls: type) -> SAEnum:
    """Enum persistido como VARCHAR + CHECK, compatible con SQLite y PostgreSQL."""
    return SAEnum(enum_cls, native_enum=False, validate_strings=True, length=32)
