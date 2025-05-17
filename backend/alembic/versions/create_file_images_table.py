"""create file images table

Revision ID: create_file_images_table
Revises: add_extracted_text_and_images
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'create_file_images_table'
down_revision = 'add_extracted_text_and_images'
branch_labels = None
depends_on = None

def upgrade():
    # Check if table exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'file_images' not in inspector.get_table_names():
        op.create_table('file_images',
            sa.Column('image_id', sa.String(36), nullable=False),
            sa.Column('file_id', sa.String(36), nullable=False),
            sa.Column('image_data', sa.LargeBinary(), nullable=False),
            sa.Column('mime_type', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('image_id'),
            sa.ForeignKeyConstraint(['file_id'], ['files.file_id'])
        )

def downgrade():
    # Check if table exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'file_images' in inspector.get_table_names():
        op.drop_table('file_images') 