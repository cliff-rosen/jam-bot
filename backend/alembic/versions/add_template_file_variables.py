"""rename variables to tokens

Revision ID: add_template_file_variables
Revises: update_file_images_to_longblob
Create Date: 2024-03-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_template_file_variables'
down_revision = 'update_file_images_to_longblob'
branch_labels = None
depends_on = None

def upgrade():
    # Update prompt_templates table
    with op.batch_alter_table('prompt_templates') as batch_op:
        # Add system_message column if it doesn't exist
        batch_op.add_column(sa.Column('system_message', sa.Text(), 
                                    nullable=True))

def downgrade():
    # Update prompt_templates table
    with op.batch_alter_table('prompt_templates') as batch_op:
        # Remove system_message column
        batch_op.drop_column('system_message')

    # Update workflow_variables table
    with op.batch_alter_table('workflow_variables') as batch_op:
        # Add type column
        batch_op.add_column(sa.Column('type', sa.String(50), 
                                    nullable=False, server_default='string'))

    # Revert workflow_variables changes
    with op.batch_alter_table('workflow_variables') as batch_op:
        batch_op.drop_column('type') 