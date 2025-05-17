"""Add prompt_template to workflow steps

Revision ID: add_prompt_tmpl
Revises: remove_prompt_template_id
Create Date: 2024-02-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic
revision = 'add_prompt_tmpl'
down_revision = 'remove_prompt_template_id'
branch_labels = None
depends_on = None

def upgrade():
    # Get inspector to check for existing columns
    conn = op.get_bind()
    insp = inspect(conn)
    columns = [col['name'] for col in insp.get_columns('workflow_steps')]
    
    # Only add the column if it doesn't exist
    if 'prompt_template_id' not in columns:
        op.add_column('workflow_steps',
            sa.Column('prompt_template_id', sa.String(36), sa.ForeignKey('prompt_templates.template_id'), nullable=True)
        )

def downgrade():
    # Get inspector to check for existing columns
    conn = op.get_bind()
    insp = inspect(conn)
    columns = [col['name'] for col in insp.get_columns('workflow_steps')]
    
    # Only drop the column if it exists
    if 'prompt_template_id' in columns:
        op.drop_column('workflow_steps', 'prompt_template_id') 