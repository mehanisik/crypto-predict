"""Remove unique constraint from predictions request_id

Revision ID: remove_unique_constraint_predictions_request_id
Revises: fix_predictions_request_id_unique
Create Date: 2025-09-02 21:06:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'remove_unique_constraint_predictions_request_id'
down_revision = 'fix_predictions_request_id_unique'
branch_labels = None
depends_on = None


def upgrade():
    # Remove the unique constraint from request_id index
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=False)


def downgrade():
    # Restore the unique constraint
    op.drop_index('ix_predictions_request_id', table_name='predictions')
    op.create_index('ix_predictions_request_id', 'predictions', ['request_id'], unique=True)
