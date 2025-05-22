from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP, JSON, LargeBinary, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote, validates
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint
from uuid import uuid4
import json
from schemas.asset import AssetType, CollectionType
from schemas.workflow import WorkflowStatus

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
    google_credentials = relationship("GoogleOAuth2Credentials", back_populates="user", uselist=False)
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")

class GoogleOAuth2Credentials(Base):
    __tablename__ = "google_oauth2_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    token = Column(String(255))
    refresh_token = Column(String(255))
    token_uri = Column(String(255))
    client_id = Column(String(255))
    client_secret = Column(String(255))
    scopes = Column(JSON)  # Store scopes as JSON array
    expiry = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="google_credentials")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(255), nullable=False)
    subtype = Column(String(255), nullable=True)
    is_collection = Column(Boolean, default=False)
    collection_type = Column(Enum(CollectionType, values_callable=lambda obj: [e.value for e in obj]), nullable=True)
    content = Column(JSON, nullable=True)
    asset_metadata = Column(JSON, nullable=False, default=dict)
    db_entity_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assets")
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

