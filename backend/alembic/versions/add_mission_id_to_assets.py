"""Add mission_id to assets table and remove mission_state_asset_ids from missions

Revision ID: add_mission_id_to_assets
Revises: create_tool_executions_table
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'add_mission_id_to_assets'
down_revision = 'create_tool_executions_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add mission_id column to assets table
    op.add_column('assets', sa.Column('mission_id', sa.String(36), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_assets_mission_id',
        'assets',
        'missions',
        ['mission_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for better query performance
    op.create_index('ix_assets_mission_id', 'assets', ['mission_id'])
    
    # TODO: Data migration script would go here to:
    # 1. Read mission_state_asset_ids from missions table
    # 2. Update assets table with corresponding mission_id
    # 3. Remove mission_state_asset_ids column from missions table
    
    # For now, just remove the column (data migration would happen separately)
    # op.drop_column('missions', 'mission_state_asset_ids')


def downgrade():
    # Re-add mission_state_asset_ids column to missions
    op.add_column('missions', sa.Column('mission_state_asset_ids', sa.JSON(), nullable=True))
    
    # Remove index and foreign key
    op.drop_index('ix_assets_mission_id', 'assets')
    op.drop_constraint('fk_assets_mission_id', 'assets', type_='foreignkey')
    
    # Remove mission_id column from assets
    op.drop_column('assets', 'mission_id') 