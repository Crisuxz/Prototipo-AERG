"""lineitem LTI en assignments

Revision ID: c7d2e4a1f9b3
Revises: 5c137c3ca63b
Create Date: 2026-10-09 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d2e4a1f9b3'
down_revision: Union[str, Sequence[str], None] = '5c137c3ca63b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """URL de lineitem (AGS) y contexto del launch LTI 1.3 (RI-06, RF-20)."""
    with op.batch_alter_table('assignments') as batch_op:
        batch_op.add_column(sa.Column('lti_lineitem_url', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('lti_context_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('assignments') as batch_op:
        batch_op.drop_column('lti_context_id')
        batch_op.drop_column('lti_lineitem_url')
