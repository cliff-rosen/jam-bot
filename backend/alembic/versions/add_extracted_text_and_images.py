"""add extracted_text and images

Revision ID: add_extracted_text_and_images
Revises: None
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'add_extracted_text_and_images'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add extracted_text column if it doesn't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('files')]
    
    if 'extracted_text' not in columns:
        op.add_column('files', sa.Column('extracted_text', sa.Text(), nullable=True))

def downgrade():
    # Remove extracted_text column if it exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('files')]
    
    if 'extracted_text' in columns:
        op.drop_column('files', 'extracted_text') 