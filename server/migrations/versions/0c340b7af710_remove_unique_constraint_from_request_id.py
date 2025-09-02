"""remove_unique_constraint_from_request_id

Revision ID: 0c340b7af710
Revises: 72929bfc7fb1
Create Date: 2025-09-01 12:02:35.078439

"""
from alembic import op
import sqlalchemy as sa


revision = '0c340b7af710'
down_revision = '72929bfc7fb1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the unique constraint on request_id
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    # Recreate the index without unique constraint
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=False)


def downgrade() -> None:
    # Drop the non-unique index
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    # Recreate the unique constraint
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=True)
