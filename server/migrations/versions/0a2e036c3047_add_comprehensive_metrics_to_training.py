"""add_comprehensive_metrics_to_training

Revision ID: 0a2e036c3047
Revises: 0c340b7af710
Create Date: 2025-09-01 12:11:45.015716

"""
from alembic import op
import sqlalchemy as sa


revision = '0a2e036c3047'
down_revision = '0c340b7af710'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add comprehensive metrics columns to training_sessions table
    op.add_column('training_sessions', sa.Column('r2_score', sa.Float(), nullable=True))
    op.add_column('training_sessions', sa.Column('mae', sa.Float(), nullable=True))
    op.add_column('training_sessions', sa.Column('rmse', sa.Float(), nullable=True))
    op.add_column('training_sessions', sa.Column('mape', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove comprehensive metrics columns from training_sessions table
    op.drop_column('training_sessions', 'mape')
    op.drop_column('training_sessions', 'rmse')
    op.drop_column('training_sessions', 'mae')
    op.drop_column('training_sessions', 'r2_score')
