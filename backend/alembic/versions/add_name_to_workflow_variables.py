"""add_name_to_workflow_variables

Revision ID: add_name_to_vars
Revises: add_prompt_tmpl
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'add_name_to_vars'
down_revision = 'add_prompt_tmpl'
branch_labels = None
depends_on = None

def upgrade():
    # Get inspector to check for existing columns
    conn = op.get_bind()
    insp = inspect(conn)

    # Add name column to workflow_variables
    with op.batch_alter_table('workflow_variables') as batch_op:
        # Add the name column if it doesn't exist
        var_columns = [col['name'] for col in insp.get_columns('workflow_variables')]
        if 'name' not in var_columns:
            batch_op.add_column(sa.Column('name', sa.String(255), nullable=True))
            
            # Update the name column with values from the schema using MySQL's JSON_EXTRACT
            op.execute("""
                UPDATE workflow_variables 
                SET name = JSON_UNQUOTE(JSON_EXTRACT(schema, '$.name'))
                WHERE name IS NULL
            """)
            
            # Make name column not nullable
            batch_op.alter_column('name', nullable=False)

def downgrade():
    # Get inspector to check for existing columns
    conn = op.get_bind()
    insp = inspect(conn)
    
    # Remove name column from workflow_variables if it exists
    var_columns = [col['name'] for col in insp.get_columns('workflow_variables')]
    if 'name' in var_columns:
        with op.batch_alter_table('workflow_variables') as batch_op:
            batch_op.drop_column('name') 