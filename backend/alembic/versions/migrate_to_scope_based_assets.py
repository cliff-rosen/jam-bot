"""Migrate assets to scope-based system

Revision ID: migrate_to_scope_based_assets
Revises: create_mission_table
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers
revision = 'migrate_to_scope_based_assets'
down_revision = 'create_mission_table'
branch_labels = None
depends_on = None

def upgrade():
    # Add new scope-based columns
    op.add_column('assets', sa.Column('scope_type', sa.String(50), nullable=True))
    op.add_column('assets', sa.Column('scope_id', sa.String(255), nullable=True))
    op.add_column('assets', sa.Column('asset_key', sa.String(255), nullable=True))
    
    # Migrate existing data
    connection = op.get_bind()
    
    # Update existing assets with mission_id to use scope-based system
    connection.execute(text("""
        UPDATE assets 
        SET scope_type = 'mission',
            scope_id = mission_id,
            asset_key = COALESCE(mission_asset_name, name)
        WHERE mission_id IS NOT NULL
    """))
    
    # For assets without mission_id, we'll need to determine their scope
    # For now, set them as mission-level with a placeholder scope_id
    connection.execute(text("""
        UPDATE assets 
        SET scope_type = 'mission',
            scope_id = 'orphaned',
            asset_key = name
        WHERE scope_type IS NULL
    """))
    
    # Make the new columns non-nullable
    op.alter_column('assets', 'scope_type', nullable=False)
    op.alter_column('assets', 'scope_id', nullable=False)
    op.alter_column('assets', 'asset_key', nullable=False)
    
    # Remove old columns
    op.drop_column('assets', 'mission_asset_name')
    op.drop_column('assets', 'mission_id')

def downgrade():
    # Add back old columns
    op.add_column('assets', sa.Column('mission_id', sa.String(36), nullable=True))
    op.add_column('assets', sa.Column('mission_asset_name', sa.String(255), nullable=True))
    
    # Migrate data back
    connection = op.get_bind()
    
    # Restore mission_id and mission_asset_name for mission-scoped assets
    connection.execute(text("""
        UPDATE assets 
        SET mission_id = scope_id,
            mission_asset_name = asset_key
        WHERE scope_type = 'mission' AND scope_id != 'orphaned'
    """))
    
    # Remove scope-based columns
    op.drop_column('assets', 'asset_key')
    op.drop_column('assets', 'scope_id')
    op.drop_column('assets', 'scope_type')
    
    # Re-add foreign key constraint
    op.create_foreign_key(None, 'assets', 'missions', ['mission_id'], ['id']) 