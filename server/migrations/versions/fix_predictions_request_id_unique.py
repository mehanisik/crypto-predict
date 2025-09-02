"""Fix predictions request_id unique constraint

Revision ID: fix_predictions_request_id_unique
Revises: 0da951318e3b
Create Date: 2025-08-31 19:22:30.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'fix_predictions_request_id_unique'
down_revision = '0da951318e3b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the unique constraint on request_id to allow multiple predictions per request
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    # Recreate the index without unique constraint
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=False)


def downgrade() -> None:
    # Restore the unique constraint
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=True)
