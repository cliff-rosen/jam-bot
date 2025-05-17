"""merge prompt template tokens

Revision ID: merge_prompt_template_tokens
Revises: update_prompt_templates
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'merge_prompt_template_tokens'
down_revision = 'update_prompt_templates'
branch_labels = None
depends_on = None

def upgrade():
    # No changes needed - data migration already handled
    pass

def downgrade():
    # No changes needed - data migration already handled
    pass 