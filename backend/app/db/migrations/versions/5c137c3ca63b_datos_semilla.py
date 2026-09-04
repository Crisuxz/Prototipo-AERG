"""datos semilla

Revision ID: 5c137c3ca63b
Revises: b1e466eb9fff
Create Date: 2026-09-03 21:29:32.913574

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c137c3ca63b'
down_revision: Union[str, Sequence[str], None] = 'b1e466eb9fff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Docente de prueba (RS-01/RS-02) e integracion LMS simulador (RI-01/RI-02)."""
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        sa.table(
            "users",
            sa.column("id", sa.Integer),
            sa.column("external_id", sa.String),
            sa.column("name", sa.String),
            sa.column("email", sa.String),
            sa.column("role", sa.String),
            sa.column("source", sa.String),
            sa.column("created_at", sa.DateTime),
        ),
        [
            {
                "id": 1,
                "external_id": None,
                "name": "Docente de prueba",
                "email": "docente@prototipo.local",
                "role": "TEACHER",
                "source": "LOCAL",
                "created_at": now,
            }
        ],
    )
    op.bulk_insert(
        sa.table(
            "lms_integrations",
            sa.column("id", sa.Integer),
            sa.column("name", sa.String),
            sa.column("type", sa.String),
            sa.column("config", sa.JSON),
            sa.column("is_active", sa.Boolean),
            sa.column("created_at", sa.DateTime),
        ),
        [
            {
                "id": 1,
                "name": "Simulador LMS",
                "type": "SIMULATOR",
                "config": {},
                "is_active": True,
                "created_at": now,
            }
        ],
    )


def downgrade() -> None:
    op.execute("DELETE FROM lms_integrations WHERE id = 1")
    op.execute("DELETE FROM users WHERE id = 1")
