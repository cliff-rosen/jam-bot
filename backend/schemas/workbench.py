"""
Workbench Core Schemas

Core business object schemas for the workbench functionality
These must align exactly with the frontend types in workbench.ts
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

from schemas.canonical_types import CanonicalResearchArticle


# ================== COLUMN METADATA AND DATA STRUCTURES ==================

class WorkbenchColumnMetadata(BaseModel):
    """Column metadata stored in article groups - matches frontend WorkbenchColumnMetadata"""
    name: str = Field(..., description="Column name")
    description: str = Field(..., description="Column description for LLM extraction")
    type: Literal['boolean', 'text', 'score', 'number'] = Field(..., description="Column data type")
    options: Optional[Dict[str, Any]] = Field(None, description="Column options (e.g., min/max for score)")
    is_extracted: bool = Field(..., description="Whether this column has been extracted")
    extraction_method: Optional[Literal['ai', 'manual', 'computed']] = Field(None, description="How column was extracted")


# Note: WorkbenchColumn exists only in frontend (includes id and data)
# Backend uses TabelizerColumnData for internal operations

class TabelizerColumnData(BaseModel):
    """Full column data including values for display - used internally by backend"""
    id: str = Field(..., description="Unique column identifier")
    name: str = Field(..., description="Column name")
    description: str = Field(..., description="Column description")
    type: Literal['boolean', 'text', 'score', 'number'] = Field(..., description="Column data type")
    data: Dict[str, str] = Field(default_factory=dict, description="Mapping of article_id to value")
    options: Optional[Dict[str, Any]] = Field(None, description="Column options")


# ================== ARTICLE GROUP STRUCTURES ==================

class ArticleGroupItem(BaseModel):
    """Individual article item in a group with metadata - matches frontend ArticleGroupItem"""
    article: CanonicalResearchArticle = Field(..., description="The article data")
    position: int = Field(..., description="Position in the group")
    column_data: Dict[str, Any] = Field(default_factory=dict, description="Extracted column data")
    workbench_summary: Dict[str, Any] = Field(default_factory=dict, description="Workbench metadata summary")


class ArticleGroupDetail(BaseModel):
    """Detailed article group with articles and columns - matches frontend ArticleGroupDetail"""
    id: str = Field(..., description="Group ID")
    name: str = Field(..., description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    article_count: int = Field(..., description="Number of articles in group")
    columns: List[WorkbenchColumnMetadata] = Field(..., description="Column metadata")
    search_context: Optional[Dict[str, Any]] = Field(None, description="Search context")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    articles: List[ArticleGroupItem] = Field(..., description="Articles with metadata")


class ArticleGroup(BaseModel):
    """Base article group info - matches frontend ArticleGroup"""
    id: str = Field(..., description="Group ID")
    user_id: int = Field(..., description="Owner user ID")
    name: str = Field(..., description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    columns: List[WorkbenchColumnMetadata] = Field(default_factory=list, description="Column metadata")
    article_count: int = Field(..., description="Number of articles in group")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")


# ================== ADDITIONAL BACKEND TYPES ==================
# Note: These types exist only in the frontend:
# - WorkbenchState (frontend UI state)
# - ArticleGroupSummary (frontend display type)
# - ArticlePreview (frontend display type)
# - WorkbenchData (individual article research)
# - ExtractedFeature (individual article features)
# - WorkbenchMetadata (individual article metadata)
# - AnalysisPreset (analysis presets)