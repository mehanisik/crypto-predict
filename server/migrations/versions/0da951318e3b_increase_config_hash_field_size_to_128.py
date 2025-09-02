"""Increase config_hash field size to 128

Revision ID: 0da951318e3b
Revises: fac13219ec01
Create Date: 2025-08-31 15:03:04.891027

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


revision = '0da951318e3b'
down_revision = 'fac13219ec01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    if op.get_bind().dialect.name == 'sqlite':
        # Create new table with correct schema
        op.create_table(
            'model_configurations_new',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('config_hash', sa.String(length=128), nullable=False),
            sa.Column('model_type', sa.String(length=50), nullable=False),
            sa.Column('ticker', sa.String(length=20), nullable=False),
            sa.Column('lookback_days', sa.Integer(), nullable=False),
            sa.Column('epochs', sa.Integer(), nullable=False),
            sa.Column('batch_size', sa.Integer(), nullable=False),
            sa.Column('learning_rate', sa.Float(), nullable=False),
            sa.Column('hidden_layers', sa.JSON(), nullable=True),
            sa.Column('dropout_rate', sa.Float(), nullable=True),
            sa.Column('activation_function', sa.String(length=50), nullable=True),
            sa.Column('optimizer', sa.String(length=50), nullable=True),
            sa.Column('loss_function', sa.String(length=50), nullable=True),
            sa.Column('validation_split', sa.Float(), nullable=True),
            sa.Column('early_stopping_patience', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes
        op.create_index(op.f('ix_model_configurations_config_hash'), 'model_configurations_new', ['config_hash'], unique=True)
        op.create_index(op.f('ix_model_configurations_is_active'), 'model_configurations_new', ['is_active'], unique=False)
        op.create_index(op.f('ix_model_configurations_model_type'), 'model_configurations_new', ['model_type'], unique=False)
        op.create_index(op.f('ix_model_configurations_ticker'), 'model_configurations_new', ['ticker'], unique=False)
        
        # Copy data from old table
        op.execute(
            'INSERT INTO model_configurations_new SELECT * FROM model_configurations'
        )
        
        # Drop old table
        op.drop_table('model_configurations')
        
        # Rename new table
        op.rename_table('model_configurations_new', 'model_configurations')
    else:
        # PostgreSQL/other databases can use ALTER COLUMN
        op.alter_column('model_configurations', 'config_hash',
                   existing_type=sa.VARCHAR(length=64),
                   type_=sa.String(length=128),
                   existing_nullable=False)


def downgrade() -> None:
    if op.get_bind().dialect.name == 'sqlite':
        # Recreate table with original schema
        op.create_table(
            'model_configurations_old',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('config_hash', sa.String(length=64), nullable=False),
            sa.Column('model_type', sa.String(length=50), nullable=False),
            sa.Column('ticker', sa.String(length=20), nullable=False),
            sa.Column('lookback_days', sa.Integer(), nullable=False),
            sa.Column('epochs', sa.Integer(), nullable=False),
            sa.Column('batch_size', sa.Integer(), nullable=False),
            sa.Column('learning_rate', sa.Float(), nullable=False),
            sa.Column('hidden_layers', sa.JSON(), nullable=True),
            sa.Column('dropout_rate', sa.Float(), nullable=True),
            sa.Column('activation_function', sa.String(length=50), nullable=True),
            sa.Column('optimizer', sa.String(length=50), nullable=True),
            sa.Column('loss_function', sa.String(length=50), nullable=True),
            sa.Column('validation_split', sa.Float(), nullable=True),
            sa.Column('early_stopping_patience', sa.Integer(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes
        op.create_index(op.f('ix_model_configurations_config_hash'), 'model_configurations_old', ['config_hash'], unique=True)
        op.create_index(op.f('ix_model_configurations_is_active'), 'model_configurations_old', ['is_active'], unique=False)
        op.create_index(op.f('ix_model_configurations_model_type'), 'model_configurations_old', ['model_type'], unique=False)
        op.create_index(op.f('ix_model_configurations_ticker'), 'model_configurations_old', ['ticker'], unique=False)
        
        # Copy data back
        op.execute(
            'INSERT INTO model_configurations_old SELECT * FROM model_configurations'
        )
        
        # Drop new table
        op.drop_table('model_configurations')
        
        # Rename old table
        op.rename_table('model_configurations_old', 'model_configurations')
    else:
        # PostgreSQL/other databases can use ALTER COLUMN
        op.alter_column('model_configurations', 'config_hash',
                   existing_type=sa.String(length=128),
                   type_=sa.VARCHAR(length=64),
                   existing_nullable=False)
