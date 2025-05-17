from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

class FileType(str, Enum):
    """File type representing the file format"""
    # Common file types
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    TXT = "txt"
    CSV = "csv"
    JSON = "json"
    # Image types
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    GIF = "gif"
    # Audio/Video types
    MP3 = "mp3"
    MP4 = "mp4"
    WAV = "wav"
    # Other
    UNKNOWN = "unknown"

    @classmethod
    def _missing_(cls, value):
        if value is None:
            return None
        # Try exact match first
        try:
            return cls(value)
        except ValueError:
            # Try case-insensitive match
            try:
                return cls(value.lower())
            except ValueError:
                return None

class DataType(str, Enum):
    """Data type for structured content"""
    UNSTRUCTURED = "unstructured"
    EMAIL_LIST = "email_list"
    GENERIC_LIST = "generic_list"
    GENERIC_TABLE = "generic_table"
    EMAIL_MESSAGE = "email_message"
    EMAIL_SUMMARIES_LIST = "email_summaries_list"

    @classmethod
    def _missing_(cls, value):
        if value is None:
            return None
        # Try exact match first
        try:
            return cls(value)
        except ValueError:
            # Try case-insensitive match
            try:
                return cls(value.lower())
            except ValueError:
                return None

class AgentType(str, Enum):
    DATA_COLLECTION = "data_collection"
    INFORMATION_RETRIEVAL = "information_retrieval"
    ANALYSIS = "analysis"

class AgentStatus(str, Enum):
    PROPOSED = "proposed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"

class ActionType(str, Enum):
    APPROVE_AGENT = "approve_agent"
    REJECT_AGENT = "reject_agent"
    LAUNCH_AGENT = "launch_agent"
    MODIFY_ASSET = "modify_asset"
    NEXT_STEP = "next_step"

class ActionButton(BaseModel):
    id: str
    label: str
    action: ActionType
    data: Optional[Dict[str, Any]] = None

class Asset(BaseModel):
    asset_id: str
    name: str
    description: Optional[str] = None
    fileType: FileType
    dataType: Optional[DataType] = None
    content: Optional[Any] = None
    metadata: Dict[str, Any] = {}

class Agent(BaseModel):
    agent_id: str
    type: AgentType
    description: str
    status: AgentStatus
    metadata: Dict[str, Any] = {
        "createdAt": datetime.now(),
        "lastRunAt": None,
        "completionTime": None,
        "progress": 0,
        "estimatedCompletion": None
    }
    input_asset_ids: List[str] = []
    output_asset_ids: List[str] = []

class CreateAssetRequest(BaseModel):
    name: str
    description: Optional[str] = None
    fileType: FileType
    dataType: Optional[DataType] = None
    content: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = None 