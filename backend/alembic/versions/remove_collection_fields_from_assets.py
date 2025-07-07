"""Remove redundant collection fields from assets table

Revision ID: remove_collection_fields_from_assets  
Revises: add_mission_id_to_assets
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'remove_collection_fields_from_assets'
down_revision = 'add_mission_id_to_assets'
branch_labels = None
depends_on = None


def upgrade():
    # Remove redundant collection fields from assets table
    # The type field and schema_definition handle this information
    op.drop_column('assets', 'is_collection')
    op.drop_column('assets', 'collection_type')


def downgrade():
    # Re-add the collection fields if needed
    op.add_column('assets', sa.Column('is_collection', sa.Boolean(), default=False))
    op.add_column('assets', sa.Column('collection_type', 
                                    sa.Enum('array', 'map', 'set', 'null', name='collectiontype'), 
                                    nullable=True)) 