"""merge workflow heads

Revision ID: merge_workflow_heads
Revises: add_name_to_vars, create_file_images_table, merge_prompt_template_tokens
Create Date: 2024-03-19 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_workflow_heads'
down_revision = ('add_name_to_vars', 'create_file_images_table', 'merge_prompt_template_tokens')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass 