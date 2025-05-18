"""add newsletter summaries table

Revision ID: 20240320000000
Revises: 
Create Date: 2024-03-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '20240320000000'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'newsletter_summaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('period_type', sa.String(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('summary', JSONB, nullable=False),
        sa.Column('source_count', sa.Integer(), nullable=False),
        sa.Column('source_ids', sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column('created_at', sa.Date(), nullable=False),
        sa.Column('updated_at', sa.Date(), nullable=False),
        sa.Column('metadata', JSONB, nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for common queries
    op.create_index(
        'ix_newsletter_summaries_period_type',
        'newsletter_summaries',
        ['period_type']
    )
    op.create_index(
        'ix_newsletter_summaries_start_date',
        'newsletter_summaries',
        ['start_date']
    )
    op.create_index(
        'ix_newsletter_summaries_end_date',
        'newsletter_summaries',
        ['end_date']
    )

def downgrade():
    op.drop_index('ix_newsletter_summaries_end_date')
    op.drop_index('ix_newsletter_summaries_start_date')
    op.drop_index('ix_newsletter_summaries_period_type')
    op.drop_table('newsletter_summaries') 