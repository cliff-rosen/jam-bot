from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP, JSON, LargeBinary, Boolean, UniqueConstraint, Index, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote, validates
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint
from uuid import uuid4
import json
from enum import Enum as PyEnum

Base = declarative_base()

# Define enums directly in models to break circular dependency
class MissionStatus(str, PyEnum):
    """Status of a mission"""
    AWAITING_APPROVAL = "awaiting_approval"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class HopStatus(str, PyEnum):
    """Status of a hop"""
    HOP_PLAN_STARTED = "hop_plan_started"
    HOP_PLAN_PROPOSED = "hop_plan_proposed"
    HOP_PLAN_READY = "hop_plan_ready"
    HOP_IMPL_STARTED = "hop_impl_started"
    HOP_IMPL_PROPOSED = "hop_impl_proposed"
    HOP_IMPL_READY = "hop_impl_ready"
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

class AssetStatus(str, PyEnum):
    """Status of an asset"""
    PROPOSED = "proposed"       # Asset created in mission/hop proposal, awaiting user approval
    PENDING = "pending"         # User approved, asset ready to be worked on
    IN_PROGRESS = "in_progress" # Tool is currently processing this asset
    READY = "ready"            # Asset processing completed successfully
    ERROR = "error"            # Asset processing failed
    EXPIRED = "expired"        # Asset data is stale/invalid

class AssetRole(str, PyEnum):
    """Role of an asset in workflow"""
    INPUT = "input"
    OUTPUT = "output"
    INTERMEDIATE = "intermediate"

class AssetScopeType(str, PyEnum):
    """Scope type for asset"""
    MISSION = "mission"
    HOP = "hop"

class MessageRole(str, PyEnum):
    """Role of a message in chat"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"
    STATUS = "status"

class UserSessionStatus(str, PyEnum):
    """Status of a user session"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    ARCHIVED = "archived"

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
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

    hops = relationship("Hop", cascade="all, delete-orphan")
    article_groups = relationship("ArticleGroup", back_populates="user", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    schema_definition = Column(JSON, nullable=False)  # Full schema definition from SchemaEntity
    subtype = Column(String(255), nullable=True)
    
    # Scope information - unified approach for mission and hop level assets
    scope_type = Column(Enum(AssetScopeType), nullable=False)
    scope_id = Column(String(255), nullable=False)   # mission_id or hop_id
    
    # Asset lifecycle
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.PROPOSED)
    role = Column(Enum(AssetRole), nullable=False)  # Role of asset in workflow: input, output, intermediate
    
    # Content strategy
    content = Column(JSON, nullable=True)            # Full content
    content_summary = Column(Text, nullable=True)    # For value_representation
    asset_metadata = Column(JSON, nullable=False, default=dict)
    db_entity_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assets")
    
    # Indexes
    __table_args__ = (
        Index("idx_asset_scope", "scope_type", "scope_id"),
        Index("idx_asset_user_scope", "user_id", "scope_type", "scope_id"),
        Index("idx_asset_user_status", "user_id", "status"),
        Index("idx_asset_user_role", "user_id", "role"),
    )


class MissionAsset(Base):
    """Mission to Asset mapping table"""
    __tablename__ = "mission_assets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=False)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False)
    role = Column(Enum(AssetRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mission = relationship("Mission", back_populates="mission_assets")
    asset = relationship("Asset")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("mission_id", "asset_id", name="unique_mission_asset"),
        Index("idx_mission_asset_mission", "mission_id"),
        Index("idx_mission_asset_asset", "asset_id"),
        Index("idx_mission_asset_role", "mission_id", "role"),
    )


class HopAsset(Base):
    """Hop to Asset mapping table"""
    __tablename__ = "hop_assets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    hop_id = Column(String(36), ForeignKey("hops.id"), nullable=False)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False)
    role = Column(Enum(AssetRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    hop = relationship("Hop", back_populates="hop_assets")
    asset = relationship("Asset")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("hop_id", "asset_id", name="unique_hop_asset"),
        Index("idx_hop_asset_hop", "hop_id"),
        Index("idx_hop_asset_asset", "asset_id"),
        Index("idx_hop_asset_role", "hop_id", "role"),
    )

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
    status = Column(Enum(MissionStatus), nullable=False, default=MissionStatus.AWAITING_APPROVAL)
    
    # Current hop tracking
    current_hop_id = Column(String(36), ForeignKey("hops.id"), nullable=True)
    
    # JSON fields for complex data
    success_criteria = Column(JSON, nullable=True)  # List of strings
    mission_metadata = Column(JSON, nullable=True)  # Additional metadata
    
    # Assets are queried by scope: scope_type='mission' AND scope_id=mission.id
    # NO input_asset_ids or output_asset_ids fields needed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="missions")
    session = relationship("UserSession", back_populates="mission", uselist=False)
    current_hop = relationship("Hop", foreign_keys=[current_hop_id], post_update=True)
    hops = relationship("Hop", back_populates="mission", cascade="all, delete-orphan", order_by="Hop.sequence_order", foreign_keys="Hop.mission_id")
    mission_assets = relationship("MissionAsset", back_populates="mission", cascade="all, delete-orphan")

class Hop(Base):
    __tablename__ = "hops"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    
    # Basic hop information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    success_criteria = Column(JSON, nullable=True)  # List of strings
    rationale = Column(Text, nullable=True)
    status = Column(Enum(HopStatus), nullable=False, default=HopStatus.HOP_PLAN_STARTED)
    
    # metadata
    is_final = Column(Boolean, nullable=False, default=False)
    is_resolved = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)
    hop_metadata = Column(JSON, nullable=True)  # Additional metadata
    
    # Assets are queried by scope: scope_type='hop' AND scope_id=hop.id
    # NO input_asset_ids or output_asset_ids fields needed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mission = relationship("Mission", foreign_keys=[mission_id], back_populates="hops")
    user = relationship("User", back_populates="hops")
    tool_steps = relationship("ToolStep", back_populates="hop", cascade="all, delete-orphan", order_by="ToolStep.sequence_order")
    hop_assets = relationship("HopAsset", back_populates="hop", cascade="all, delete-orphan")

class ToolStep(Base):
    __tablename__ = "tool_steps"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    hop_id = Column(String(36), ForeignKey("hops.id"), nullable=False)
    tool_id = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)

    # Basic tool step information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ToolExecutionStatus), nullable=False, default=ToolExecutionStatus.PROPOSED)
    
    parameter_mapping = Column(JSON, nullable=True)  # Dict of parameter mappings
    result_mapping = Column(JSON, nullable=True)  # Dict of result mappings
    resource_configs = Column(JSON, nullable=True)  # Resource configurations

    validation_errors = Column(JSON, nullable=True)  # List of validation errors
    execution_result = Column(JSON, nullable=True)  # Tool execution results
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    hop = relationship("Hop", back_populates="tool_steps")
    user = relationship("User")

class ToolExecution(Base):
    """Separate execution records from tool step definitions"""
    __tablename__ = "tool_executions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tool_step_id = Column(String(36), ForeignKey("tool_steps.id"), nullable=True)  # Optional link to tool step
    tool_id = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    # Execution context
    hop_id = Column(String(36), ForeignKey("hops.id"), nullable=True)  # Optional hop context
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=True)  # Optional mission context
    
    # Execution details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ToolExecutionStatus), nullable=False, default=ToolExecutionStatus.PROPOSED)
    
    # Input/Output data
    input_parameters = Column(JSON, nullable=True)  # Tool input parameters
    input_assets = Column(JSON, nullable=True)  # Asset references used as input
    output_results = Column(JSON, nullable=True)  # Tool execution results
    output_assets = Column(JSON, nullable=True)  # Asset references created as output
    
    # Execution metadata
    execution_config = Column(JSON, nullable=True)  # Tool-specific execution configuration
    error_details = Column(JSON, nullable=True)  # Detailed error information
    error_message = Column(Text, nullable=True)  # Human-readable error message
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    tool_step = relationship("ToolStep", foreign_keys=[tool_step_id])
    hop = relationship("Hop", foreign_keys=[hop_id])
    mission = relationship("Mission", foreign_keys=[mission_id])
    user = relationship("User")

class Chat(Base):
    __tablename__ = "chats"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=True)  # Optional title for the conversation
    
    # Chat context
    context_data = Column(JSON, nullable=True)  # Dict[str, Any] - payload history, etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chats")
    session = relationship("UserSession", back_populates="chat", uselist=False)
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan", 
                          order_by="ChatMessage.sequence_order")
    
    # Indexes
    __table_args__ = (
        Index('idx_chats_user_id', 'user_id'),
        Index('idx_chats_created_at', 'created_at'),
    )

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=True)  # Optional user-provided name
    status = Column(Enum(UserSessionStatus), nullable=False, default=UserSessionStatus.ACTIVE)
    
    # Relationships
    chat_id = Column(String(36), ForeignKey("chats.id"), nullable=False)
    mission_id = Column(String(36), ForeignKey("missions.id"), nullable=True)
    
    # Session metadata
    session_metadata = Column(JSON, nullable=True)  # Dict[str, Any]
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")
    chat = relationship("Chat", back_populates="session")
    mission = relationship("Mission", back_populates="session")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_sessions_user_id', 'user_id'),
        Index('idx_user_sessions_status', 'status'),
        Index('idx_user_sessions_last_activity', 'last_activity_at'),
    )

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    # Core fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    chat_id = Column(String(36), ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    
    # Message content
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    
    # Message metadata
    message_metadata = Column(JSON, nullable=True)  # Dict[str, Any]
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    user = relationship("User")
    
    # Indexes
    __table_args__ = (
        Index('idx_chat_messages_chat_id', 'chat_id'),
        Index('idx_chat_messages_sequence', 'chat_id', 'sequence_order'),
        Index('idx_chat_messages_role', 'role'),
        Index('idx_chat_messages_created_at', 'created_at'),
    )


class ArticleGroup(Base):
    """
    Article groups - collections of research articles with shared analysis context.
    
    Groups define feature extraction schemas and contain articles with contextual 
    feature data. Each group acts as an analytical workspace where articles can
    have different extracted features based on the research focus.
    """
    __tablename__ = "article_group"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Group metadata
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Search context (if group was created from search results)
    search_query = Column(Text, nullable=True)
    search_provider = Column(String(50), nullable=True)
    search_params = Column(JSON, nullable=True)
    
    # Feature definitions - what features can be extracted for articles in this group
    # Stores List[FeatureDefinition] as JSON array
    # Each FeatureDefinition has: {id: str, name: str, description: str, type: str, options: dict}
    feature_definitions = Column(JSON, nullable=False, default=list)
    
    # Statistics
    article_count = Column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="article_groups")
    articles = relationship("ArticleGroupDetail", back_populates="group", cascade="all, delete-orphan")
    
    # Helper methods for working with feature definitions
    def get_feature_definition_by_id(self, feature_id: str):
        """Get a specific feature definition by its ID."""
        for feature_def in (self.feature_definitions or []):
            if isinstance(feature_def, dict) and feature_def.get('id') == feature_id:
                return feature_def
        return None
    
    def has_feature_definition(self, feature_id: str) -> bool:
        """Check if this group has a specific feature definition."""
        return self.get_feature_definition_by_id(feature_id) is not None
    
    # Indexes
    __table_args__ = (
        Index('idx_article_group_user_id', 'user_id'),
        Index('idx_article_group_created_at', 'created_at'),
        Index('idx_article_group_name', 'user_id', 'name'),
    )


class ArticleGroupDetail(Base):
    """
    Individual articles within an article group context - junction model.
    
    Represents the many-to-many relationship between articles and groups, storing
    contextual data that is specific to this article-group pairing. The same article
    can exist in multiple groups with different extracted features and metadata.
    """
    __tablename__ = "article_group_detail"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Foreign key
    article_group_id = Column(String(36), ForeignKey("article_group.id", ondelete="CASCADE"), nullable=False)
    
    # Article data - full CanonicalResearchArticle JSON embedded storage
    # Contains only canonical bibliographic data (title, authors, abstract, etc.)
    # Does NOT contain extracted_features - those are stored separately below
    article_data = Column(JSON, nullable=False)
    
    # Contextual data - all scoped to this article in this specific group
    notes = Column(Text, nullable=True, default='')  # User's research notes for this article in this group
    
    # Feature data - extracted features specific to this article-group relationship
    # Stores feature_data as {feature_id: extracted_value} where:
    # - Keys are FeatureDefinition.id (stable UUIDs like "feat_f47ac10b-58cc-4372-a567-0e02b2c3d479")
    # - Values are extracted feature values (strings: "yes"/"no" for boolean, text for text, numeric strings for scores)
    # - Keys must match feature definitions in the parent ArticleGroup.feature_definitions
    feature_data = Column(JSON, nullable=False, default=dict)
    
    # Article metadata - user annotations specific to this article in this group
    # Example: {tags: ["important", "methodology"], rating: 5, status: "read", priority: "high"}
    article_metadata = Column(JSON, nullable=False, default=dict)
    
    # Display order within the group
    position = Column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    group = relationship("ArticleGroup", back_populates="articles")
    
    # Helper methods for working with feature data
    def get_feature_value(self, feature_id: str, default=None):
        """Get the value of a specific feature by its ID."""
        return (self.feature_data or {}).get(feature_id, default)
    
    def set_feature_value(self, feature_id: str, value):
        """Set the value of a specific feature by its ID."""
        if self.feature_data is None:
            self.feature_data = {}
        self.feature_data[feature_id] = value
    
    def has_feature_value(self, feature_id: str) -> bool:
        """Check if this article has a value for a specific feature."""
        return feature_id in (self.feature_data or {})
    
    def remove_feature_value(self, feature_id: str):
        """Remove a feature value by its ID."""
        if self.feature_data and feature_id in self.feature_data:
            del self.feature_data[feature_id]
    
    @property
    def article(self):
        """
        Get the embedded article data as a CanonicalResearchArticle.
        Note: This returns the raw JSON - you may want to validate it with the Pydantic model.
        """
        return self.article_data
    
    # Indexes
    __table_args__ = (
        Index('idx_article_group_detail_group_id', 'article_group_id'),
        Index('idx_article_group_detail_position', 'article_group_id', 'position'),
    )

