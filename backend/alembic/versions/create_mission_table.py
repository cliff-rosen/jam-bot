"""Create mission table

Revision ID: mission_table_001
Revises: 
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'mission_table_001'
down_revision = None  # Update this to the latest revision ID
branch_labels = None
depends_on = None


def upgrade():
    # Create mission table
    op.create_table('missions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('goal', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'active', 'completed', 'failed', 'cancelled', name='missionstatus'), nullable=False, server_default='pending'),
        sa.Column('success_criteria', sa.JSON(), nullable=True),
        sa.Column('current_hop', sa.JSON(), nullable=True),
        sa.Column('hop_history', sa.JSON(), nullable=True),
        sa.Column('input_asset_ids', sa.JSON(), nullable=True),
        sa.Column('output_asset_ids', sa.JSON(), nullable=True),
        sa.Column('mission_state_asset_ids', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')),
    )
    
    # Create indices for better performance
    op.create_index('ix_missions_user_id', 'missions', ['user_id'])
    op.create_index('ix_missions_status', 'missions', ['status'])
    op.create_index('ix_missions_updated_at', 'missions', ['updated_at'])


def downgrade():
    # Drop indices
    op.drop_index('ix_missions_updated_at', 'missions')
    op.drop_index('ix_missions_status', 'missions')
    op.drop_index('ix_missions_user_id', 'missions')
    
    # Drop table
    op.drop_table('missions')
    
    # Drop enum type
    op.execute("DROP TYPE IF EXISTS missionstatus") 