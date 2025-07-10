"""
User Session Schema Definitions

This module contains all Pydantic models for managing user sessions
for persistence and API operations.
"""

from typing import Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from .workflow import Mission


class UserSessionStatus(str, Enum):
    """Status of a user session"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    ARCHIVED = "archived"


# Core session persistence model
class UserSession(BaseModel):
    """User session representing a workspace/conversation container"""
    id: str = Field(description="Unique identifier for the session")
    user_id: int = Field(description="ID of the user who owns this session")
    name: str = Field(description="Name/title of the session")
    status: UserSessionStatus = Field(default=UserSessionStatus.ACTIVE, description="Current status of the session")
    
    # Relationships
    chat_id: str = Field(description="ID of the associated chat")
    mission_id: Optional[str] = Field(default=None, description="ID of the associated mission if created")
    
    # Metadata
    session_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional session metadata")
    created_at: datetime = Field(description="When the session was created")
    updated_at: datetime = Field(description="When the session was last updated")
    last_activity_at: datetime = Field(description="When the session had its last activity")
    
    # Relationships (populated by services)
    chat: Optional['Chat'] = Field(default=None, description="Associated chat conversation")
    mission: Optional[Mission] = Field(default=None, description="Associated mission if created")


# API Request/Response models for UserSession
class CreateUserSessionRequest(BaseModel):
    """Request to create a new user session"""
    name: Optional[str] = Field(default=None, description="Name for the new session (auto-generated if not provided)")
    session_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata")


class CreateUserSessionResponse(BaseModel):
    """Response when creating a new user session"""
    user_session: UserSession = Field(description="Created user session")
    chat: 'Chat' = Field(description="Associated chat created with the session")


class UpdateUserSessionRequest(BaseModel):
    """Request to update an existing user session"""
    name: Optional[str] = Field(default=None, description="Updated name")
    status: Optional[UserSessionStatus] = Field(default=None, description="Updated status")
    mission_id: Optional[str] = Field(default=None, description="Updated mission ID")
    session_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Updated metadata")


class UserSessionLightweightResponse(BaseModel):
    """Lightweight response containing just session pointers/IDs"""
    id: str = Field(description="Session ID")
    user_id: int = Field(description="User ID")
    name: Optional[str] = Field(description="Session name")
    chat_id: str = Field(description="Associated chat ID")
    mission_id: Optional[str] = Field(default=None, description="Associated mission ID if exists")
    session_metadata: Dict[str, Any] = Field(default_factory=dict, description="Session metadata")


# Import Chat for forward references
from .chat import Chat 