from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP, JSON, LargeBinary, Boolean, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote, validates
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint
from uuid import uuid4
import json
from enum import Enum as PyEnum

# Define enums directly in models to break circular dependency
class MissionStatus(str, PyEnum):
    """Status of a mission"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ToolExecutionStatus(str, PyEnum):
    """Status of a tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

Base = declarative_base()

# Constants
ALL_TOPICS = -1  # Special value for chat threads to indicate "all topics" view

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    is_active = Column(Boolean, default=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # google_credentials = relationship("GoogleOAuth2Credentials", back_populates="user", uselist=False)
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    resource_credentials = relationship("ResourceCredentials", back_populates="user", cascade="all, delete-orphan")
    missions = relationship("Mission", back_populates="user", cascade="all, delete-orphan")
    tool_executions = relationship("ToolExecution", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(255), nullable=False)
    subtype = Column(String(255), nullable=True)
    role = Column(String(50), nullable=True)  # Role of asset in workflow: input, output, intermediate
    content = Column(JSON, nullable=True)
    asset_metadata = Column(JSON, nullable=False, default=dict)
    db_entity_metadata = Column(JSON, nullable=True)
    
    # Scope information - unified approach for mission and hop level assets
    scope_type = Column(String(50), nullable=False)  # "mission" or "hop"
    scope_id = Column(String(255), nullable=False)   # mission_id or hop_id
    asset_key = Column(String(255), nullable=False)  # The key name within the scope
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assets")
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

class ResourceCredentials(Base):
    __tablename__ = "resource_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    resource_id = Column(String(50))  # e.g. "gmail", "dropbox", etc.
    credentials = Column(JSON)  # Store all credentials as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="resource_credentials")

    # Add unique constraint for user_id and resource_id combination
    __table_args__ = (
        UniqueConstraint('user_id', 'resource_id', name='uix_user_resource'),
    )

class Mission(Base):
    __tablename__ = "missions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    status = Column(Enum(MissionStatus), nullable=False, default=MissionStatus.PENDING)
    
    # JSON fields for complex data
    success_criteria = Column(JSON, nullable=True)  # List of strings
    current_hop = Column(JSON, nullable=True)  # Full hop object
    hop_history = Column(JSON, nullable=True)  # List of hop objects
    input_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    output_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    # mission_state_asset_ids removed - now using Asset.mission_id link-back
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="missions")

class ToolExecution(Base):
    __tablename__ = "tool_executions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=True)
    tool_id = Column(String(255), nullable=False)
    step_id = Column(String(255), nullable=False)
    status = Column(Enum(ToolExecutionStatus), nullable=False, default=ToolExecutionStatus.PENDING)
    
    # JSON fields for execution data
    tool_step = Column(JSON, nullable=False)  # Full ToolStep object
    hop_state_asset_ids = Column(JSON, nullable=True)  # Dict of asset_name -> asset_id
    parameter_mapping = Column(JSON, nullable=True)  # Tool parameter mappings
    result_mapping = Column(JSON, nullable=True)  # Tool result mappings
    execution_result = Column(JSON, nullable=True)  # Tool execution results
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    mission = relationship("Mission")

