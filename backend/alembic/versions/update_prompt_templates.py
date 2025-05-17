"""update prompt templates structure

Revision ID: update_prompt_templates
Revises: add_template_file_variables
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'update_prompt_templates'
down_revision = 'add_template_file_variables'  # Fixed to point to correct previous migration
branch_labels = None
depends_on = None

def upgrade():
    # Update nullable constraints for datetime columns
    op.alter_column('prompt_templates', 'created_at',
                    existing_type=mysql.DATETIME(),
                    nullable=False)
    op.alter_column('prompt_templates', 'updated_at',
                    existing_type=mysql.DATETIME(),
                    nullable=False)

    # Add default values for datetime columns
    op.execute("""
        UPDATE prompt_templates 
        SET created_at = NOW() 
        WHERE created_at IS NULL
    """)
    op.execute("""
        UPDATE prompt_templates 
        SET updated_at = NOW() 
        WHERE updated_at IS NULL
    """)

    # Add tokens columns if they don't exist
    op.execute("""
        ALTER TABLE prompt_templates
        ADD COLUMN IF NOT EXISTS tokens JSON NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS output_schema JSON NULL DEFAULT '{"type": "string"}'
    """)

    # Ensure JSON columns have valid JSON
    op.execute("""
        UPDATE prompt_templates 
        SET tokens = '[]' 
        WHERE tokens IS NULL OR NOT JSON_VALID(tokens)
    """)
    op.execute("""
        UPDATE prompt_templates 
        SET output_schema = '{"type": "string"}' 
        WHERE output_schema IS NULL OR NOT JSON_VALID(output_schema)
    """)

def downgrade():
    # Make datetime columns nullable again
    op.alter_column('prompt_templates', 'created_at',
                    existing_type=mysql.DATETIME(),
                    nullable=True)
    op.alter_column('prompt_templates', 'updated_at',
                    existing_type=mysql.DATETIME(),
                    nullable=True)
    
    # Drop tokens columns
    op.execute("""
        ALTER TABLE prompt_templates
        DROP COLUMN IF EXISTS tokens,
        DROP COLUMN IF EXISTS output_schema
    """) 