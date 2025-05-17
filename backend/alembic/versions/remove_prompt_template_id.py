"""Remove prompt_template_id from tools

Revision ID: remove_prompt_template_id
Revises: populate_tools_data
Create Date: 2024-02-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = 'remove_prompt_template_id'
down_revision = 'populate_tools_data'
branch_labels = None
depends_on = None

def upgrade():
    # Remove the prompt_template_id column from tools table
    op.drop_column('tools', 'prompt_template_id')

def downgrade():
    # Add back the prompt_template_id column
    op.add_column('tools',
        sa.Column('prompt_template_id', sa.String(36), nullable=True)
    ) 