from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP, JSON, LargeBinary, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote, validates
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint
from uuid import uuid4
import json
from schemas.asset import FileType, DataType

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
    topics = relationship("Topic", back_populates="user")
    workflows = relationship("Workflow", back_populates="user")
    files = relationship("File", back_populates="user", cascade="all, delete-orphan")
    google_credentials = relationship("GoogleOAuth2Credentials", back_populates="user", uselist=False)
    assets = relationship("Asset", back_populates="user", cascade="all, delete-orphan")

class Topic(Base):
    __tablename__ = "topics"
    
    topic_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    topic_name = Column(String(255))
    creation_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="topics")

class Tool(Base):
    __tablename__ = "tools"

    tool_id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    tool_type = Column(String(50), nullable=False)  # 'llm', 'search', 'retrieve', 'utility'
    signature = Column(JSON, nullable=False, default=lambda: {"parameters": [], "outputs": []})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow_steps = relationship("WorkflowStep", back_populates="tool")

    @validates('signature')
    def validate_signature(self, key: str, value: Any) -> Dict:
        """Validate signature field to ensure it's a proper dictionary."""
        if value is None:
            return {"parameters": [], "outputs": []}
            
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {"parameters": [], "outputs": []}
                
        if not isinstance(value, dict):
            return {"parameters": [], "outputs": []}
            
        return value

class PromptTemplate(Base):
    """Model for storing prompt templates"""
    __tablename__ = "prompt_templates"

    template_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    user_message_template = Column(Text, nullable=False)
    system_message_template = Column(Text, nullable=True)
    tokens = Column(JSON, nullable=False, default=list)  # List of {name: string, type: 'string' | 'file'}
    output_schema = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @validates('tokens')
    def validate_tokens(self, key: str, value: Any) -> list:
        """Validate tokens field to ensure it's a proper list."""
        if value is None:
            return []
            
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return []
                
        if not isinstance(value, list):
            return []
            
        return value

    @validates('output_schema')
    def validate_output_schema(self, key: str, value: Any) -> Dict:
        """Validate output_schema field to ensure it's a proper dictionary."""
        if value is None:
            return {}

        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {}
                
        if not isinstance(value, dict):
            return {}
            
        return value

class WorkflowStep(Base):
    """Model for workflow steps"""
    __tablename__ = "workflow_steps"

    STEP_TYPES = ['ACTION', 'INPUT', 'EVALUATION']

    step_id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("workflows.workflow_id"), nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(Text)
    step_type = Column(String(50), nullable=False)  # 'ACTION', 'INPUT', or 'EVALUATION'
    tool_id = Column(String(36), ForeignKey("tools.tool_id"))
    prompt_template_id = Column(String(36), ForeignKey("prompt_templates.template_id"))
    parameter_mappings = Column(JSON, default=lambda: {}, nullable=False)
    output_mappings = Column(JSON, default=lambda: {}, nullable=False)
    evaluation_config = Column(JSON, default=lambda: {"conditions": [], "default_action": "continue"}, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = relationship("Workflow", back_populates="steps")
    tool = relationship("Tool")
    prompt_template = relationship("PromptTemplate")

    def __init__(self, **kwargs):
        # Ensure JSON fields have proper defaults and are dicts
        kwargs['parameter_mappings'] = self._ensure_dict(kwargs.get('parameter_mappings')) or {}
        kwargs['output_mappings'] = self._ensure_dict(kwargs.get('output_mappings')) or {}
        kwargs['evaluation_config'] = self._ensure_dict(kwargs.get('evaluation_config')) or {"conditions": [], "default_action": "continue"}
        
        # Ensure step_type is valid
        if 'step_type' in kwargs:
            if kwargs['step_type'] not in self.STEP_TYPES:
                raise ValueError(f"Invalid step_type. Must be one of: {', '.join(self.STEP_TYPES)}")
        
        super().__init__(**kwargs)

    def _ensure_dict(self, value: Any) -> Dict:
        """Helper method to ensure a value is a dictionary."""
        if value is None:
            return {}
        
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {}
        
        return value if isinstance(value, dict) else {}

    @validates('step_type')
    def validate_step_type(self, key: str, value: str) -> str:
        """Validate step_type field to ensure it's a valid type."""
        if value not in self.STEP_TYPES:
            raise ValueError(f"Invalid step_type. Must be one of: {', '.join(self.STEP_TYPES)}")
        return value

    @validates('parameter_mappings', 'output_mappings')
    def validate_mappings(self, key: str, value: Any) -> Dict:
        """Validate mapping fields to ensure they are proper dictionaries."""
        if value is None:
            return {}
            
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {}
                
        if not isinstance(value, dict):
            return {}
            
        # For parameter_mappings, ensure all values are strings
        if key == 'parameter_mappings':
            return {str(k): str(v) if v is not None else "" for k, v in value.items()}
        
        # For output_mappings, preserve objects for enhanced mappings
        return {str(k): v for k, v in value.items()}

    @validates('evaluation_config')
    def validate_evaluation_config(self, key: str, value: Any) -> Dict:
        """Validate evaluation_config field to ensure it's a proper dictionary."""
        if value is None:
            return {"conditions": [], "default_action": "continue", "maximum_jumps": 3}
            
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {"conditions": [], "default_action": "continue", "maximum_jumps": 3}
                
        if not isinstance(value, dict):
            return {"conditions": [], "default_action": "continue", "maximum_jumps": 3}
            
        # Ensure required fields exist with proper types
        conditions = value.get("conditions", [])
        if not isinstance(conditions, list):
            conditions = []
            
        # Validate each condition
        valid_conditions = []
        for condition in conditions:
            if isinstance(condition, dict):
                valid_condition = {
                    "condition_id": condition.get("condition_id", str(uuid4())),
                    "variable": str(condition.get("variable", "")),
                    "operator": str(condition.get("operator", "equals")),
                    "value": condition.get("value", ""),
                    "target_step_index": condition.get("target_step_index")
                }
                if valid_condition["operator"] not in ["equals", "not_equals", "greater_than", "less_than", "contains", "not_contains"]:
                    valid_condition["operator"] = "equals"
                valid_conditions.append(valid_condition)
                
        default_action = value.get("default_action", "continue")
        if default_action not in ["continue", "end"]:
            default_action = "continue"
            
        # Get maximum_jumps from input or use default
        maximum_jumps = value.get("maximum_jumps", 1)  # Changed default to 3
        if not isinstance(maximum_jumps, int):
            try:
                maximum_jumps = int(maximum_jumps)
            except (ValueError, TypeError):
                maximum_jumps = 3
        
        if maximum_jumps < 0:
            maximum_jumps = 1
            
        return {
            "conditions": valid_conditions,
            "default_action": default_action,
            "maximum_jumps": maximum_jumps
        }

    def to_dict(self) -> Dict:
        """Convert the model to a dictionary with properly handled JSON fields."""
        return {
            "step_id": self.step_id,
            "workflow_id": self.workflow_id,
            "label": self.label,
            "description": self.description,
            "step_type": self.step_type,
            "tool_id": self.tool_id,
            "prompt_template_id": self.prompt_template_id,
            "parameter_mappings": self.parameter_mappings,
            "output_mappings": self.output_mappings,
            "evaluation_config": self.evaluation_config,
            "sequence_number": self.sequence_number,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class WorkflowVariable(Base):
    __tablename__ = "workflow_variables"

    variable_id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("workflows.workflow_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False)
    value_schema = Column(JSON, nullable=False)
    io_type = Column(String(10), nullable=False)  # 'input' or 'output'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workflow = relationship("Workflow", back_populates="variables")

    @validates('value_schema')
    def validate_schema(self, key: str, value: Any) -> Dict:
        """Validate schema field to ensure it's a proper dictionary."""
        if value is None:
            return {}
            
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                return {}
                
        if not isinstance(value, dict):
            return {}
            
        return value

    @validates('io_type')
    def validate_io_type(self, key: str, value: str) -> str:
        """Validate io_type field to ensure it's either 'input' or 'output'."""
        if value not in ['input', 'output']:
            raise ValueError("io_type must be either 'input' or 'output'")
        return value

class Workflow(Base):
    __tablename__ = "workflows"

    workflow_id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False, default="draft")  # draft, running, completed, failed
    error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="workflows")
    steps = relationship("WorkflowStep", 
                        back_populates="workflow", 
                        cascade="all, delete-orphan",
                        order_by="WorkflowStep.sequence_number")
    variables = relationship("WorkflowVariable", back_populates="workflow", cascade="all, delete-orphan")

class File(Base):
    __tablename__ = "files"

    file_id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(LargeBinary, nullable=False)  # File contents stored as binary
    mime_type = Column(String(255), nullable=False)
    size = Column(Integer, nullable=False)  # Size in bytes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    extracted_text = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="files")

class FileImage(Base):
    __tablename__ = 'file_images'

    image_id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    file_id = Column(String(36), ForeignKey('files.file_id'), nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    mime_type = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    
    asset_id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    fileType = Column(Enum(FileType), nullable=False)
    dataType = Column(Enum(DataType), nullable=True)
    content = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="assets")
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

