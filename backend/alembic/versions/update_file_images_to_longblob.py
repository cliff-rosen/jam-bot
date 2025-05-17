"""update file images to longblob

Revision ID: update_file_images_to_longblob
Revises: add_extracted_text_and_images, add_prompt_tmpl
Create Date: 2024-03-20 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_file_images_to_longblob'
down_revision = 'update_file_content_to_binary'
branch_labels = None
depends_on = None


def upgrade():
    # Convert image_data column to LONGBLOB to handle larger images
    op.execute('ALTER TABLE file_images MODIFY COLUMN image_data LONGBLOB;')


def downgrade():
    # Convert back to regular BLOB (note: this might lose data if images are too large)
    op.execute('ALTER TABLE file_images MODIFY COLUMN image_data BLOB;') 