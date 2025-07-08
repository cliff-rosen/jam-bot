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
    PROPOSED = "proposed"
    READY_FOR_NEXT_HOP = "ready_for_next_hop" # 
    BUILDING_HOP = "building_hop"
    HOP_READY_TO_EXECUTE = "hop_ready_to_execute"
    EXECUTING_HOP = "executing_hop"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class HopStatus(str, PyEnum):
    """Status of a hop"""
    PROPOSED = "proposed"
    READY_TO_RESOLVE = "ready_to_resolve"
    READY_TO_EXECUTE = "ready_to_execute"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ToolExecutionStatus(str, PyEnum):
    """Status of a tool execution"""
    PROPOSED = "proposed"
    READY_TO_CONFIGURE = "ready_to_configure"
    READY_TO_EXECUTE = "ready_to_execute"
    EXECUTING = "executing"
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

    hops = relationship("Hop", cascade="all, delete-orphan")

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
    input_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    output_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    metadata = Column(JSON, nullable=True)  # Additional metadata
    
    # Remove current_hop and hop_history - these are now in hops table
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="missions")
    hops = relationship("Hop", back_populates="mission", cascade="all, delete-orphan", order_by="Hop.sequence_order")

class Hop(Base):
    __tablename__ = "hops"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    # Basic hop information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    status = Column(Enum(HopStatus), nullable=False, default=HopStatus.PROPOSED)
    sequence_order = Column(Integer, nullable=False)
    
    # Hop-specific fields
    rationale = Column(Text, nullable=True)
    is_final = Column(Boolean, nullable=False, default=False)
    is_resolved = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)
    
    # JSON fields for complex data
    success_criteria = Column(JSON, nullable=True)  # List of strings
    input_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    output_asset_ids = Column(JSON, nullable=True)  # List of asset IDs
    metadata = Column(JSON, nullable=True)  # Additional metadata
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mission = relationship("Mission", back_populates="hops")
    user = relationship("User", back_populates="hops")
    tool_steps = relationship("ToolStep", back_populates="hop", cascade="all, delete-orphan", order_by="ToolStep.sequence_order")

class ToolStep(Base):
    __tablename__ = "tool_steps"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    hop_id = Column(String(36), ForeignKey("hops.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    # Basic tool step information
    tool_id = Column(String(255), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    status = Column(Enum(ToolExecutionStatus), nullable=False, default=ToolExecutionStatus.PENDING)
    
    # Tool step configuration
    description = Column(Text, nullable=True)
    template = Column(Text, nullable=True)
    
    # JSON fields for complex data
    parameter_mapping = Column(JSON, nullable=True)  # Dict of parameter mappings
    result_mapping = Column(JSON, nullable=True)  # Dict of result mappings
    resource_configs = Column(JSON, nullable=True)  # Resource configurations
    validation_errors = Column(JSON, nullable=True)  # List of validation errors
    execution_result = Column(JSON, nullable=True)  # Tool execution results
    hop_state_asset_ids = Column(JSON, nullable=True)  # Dict of asset_name -> asset_id at execution time
    
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    hop = relationship("Hop", back_populates="tool_steps")
    user = relationship("User")



