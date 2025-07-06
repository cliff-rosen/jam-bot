"""Create tool executions table

Revision ID: create_tool_executions_table
Revises: create_mission_table
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'create_tool_executions_table'
down_revision = 'create_mission_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create tool_executions table
    op.create_table(
        'tool_executions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('mission_id', sa.String(36), sa.ForeignKey('missions.id'), nullable=True),
        sa.Column('tool_id', sa.String(255), nullable=False),
        sa.Column('step_id', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'completed', 'failed', 'cancelled'), nullable=False),
        sa.Column('tool_step', sa.JSON(), nullable=False),
        sa.Column('hop_state_asset_ids', sa.JSON(), nullable=True),
        sa.Column('parameter_mapping', sa.JSON(), nullable=True),
        sa.Column('result_mapping', sa.JSON(), nullable=True),
        sa.Column('execution_result', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for better query performance
    op.create_index('ix_tool_executions_user_id', 'tool_executions', ['user_id'])
    op.create_index('ix_tool_executions_mission_id', 'tool_executions', ['mission_id'])
    op.create_index('ix_tool_executions_status', 'tool_executions', ['status'])
    op.create_index('ix_tool_executions_created_at', 'tool_executions', ['created_at'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_tool_executions_created_at', 'tool_executions')
    op.drop_index('ix_tool_executions_status', 'tool_executions')
    op.drop_index('ix_tool_executions_mission_id', 'tool_executions')
    op.drop_index('ix_tool_executions_user_id', 'tool_executions')
    
    # Drop table
    op.drop_table('tool_executions') 