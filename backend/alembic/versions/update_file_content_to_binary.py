"""update file content to binary

Revision ID: update_file_content_to_binary
Revises: None
Create Date: 2024-03-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_file_content_to_binary'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Convert existing content to binary and change column type
    op.execute('ALTER TABLE files MODIFY COLUMN content LONGBLOB;')


def downgrade():
    # Note: This might lose binary data when converting back to text
    op.execute('ALTER TABLE files MODIFY COLUMN content TEXT;') 