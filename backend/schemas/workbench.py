"""
Workbench Core Business Objects

This module defines the core business object schemas for the workbench feature.
For API request/response models, see workbench_requests.py and workbench_responses.py.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

from schemas.canonical_types import CanonicalResearchArticle


class TabelizerColumnMetadata(BaseModel):
    """Column metadata stored in workbench groups"""
    id: str = Field(..., description="Unique column identifier")
    name: str = Field(..., description="Column name")
    description: str = Field(..., description="Column description for LLM extraction")
    type: Literal['boolean', 'text', 'score'] = Field(..., description="Column data type")
    options: Optional[Dict[str, Any]] = Field(None, description="Column options (e.g., min/max for score)")


class TabelizerColumnData(BaseModel):
    """Full column data including values for display"""
    id: str = Field(..., description="Unique column identifier")
    name: str = Field(..., description="Column name")
    description: str = Field(..., description="Column description")
    type: Literal['boolean', 'text', 'score'] = Field(..., description="Column data type")
    data: Dict[str, str] = Field(default_factory=dict, description="Mapping of article_id to value")
    options: Optional[Dict[str, Any]] = Field(None, description="Column options")


class WorkbenchGroupItem(BaseModel):
    """Individual article item in a workbench group with metadata"""
    article: CanonicalResearchArticle = Field(..., description="The article data")
    position: int = Field(..., description="Position in the group")
    column_data: Dict[str, Any] = Field(default_factory=dict, description="Extracted column data")
    workbench_summary: Dict[str, Any] = Field(default_factory=dict, description="Workbench metadata summary")


class WorkbenchGroupDetail(BaseModel):
    """Detailed workbench group with articles and reconstructed columns"""
    id: str = Field(..., description="Group ID")
    user_id: int = Field(..., description="Owner user ID")
    name: str = Field(..., description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    columns: List[TabelizerColumnData] = Field(..., description="Reconstructed column data")
    article_count: int = Field(..., description="Number of articles in group")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    articles: List[WorkbenchGroupItem] = Field(..., description="Articles with metadata")