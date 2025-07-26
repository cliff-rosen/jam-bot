"""
Article Group Schemas

This module defines the Pydantic models for the article group feature,
which allows users to save and load Tabelizer search results and custom columns.
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field

from schemas.canonical_types import CanonicalResearchArticle


# Base models
class ArticleGroupBase(BaseModel):
    """Base schema for article groups"""
    name: str = Field(..., min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")


class TabelizerColumnMetadata(BaseModel):
    """Column metadata stored in article_group.columns"""
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


# Request models
class CreateArticleGroupRequest(ArticleGroupBase):
    """Request to create a new article group"""
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")


class UpdateArticleGroupRequest(ArticleGroupBase):
    """Request to update article group metadata"""
    pass


class SaveToGroupRequest(BaseModel):
    """Request to save current Tabelizer state to a group"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles with extracted_features")
    columns: List[TabelizerColumnMetadata] = Field(..., description="Column metadata only")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    overwrite: bool = Field(False, description="Whether to replace existing data")


class AddArticlesRequest(BaseModel):
    """Request to add articles to an existing group"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles to add")


# Response models
class ArticleGroupResponse(ArticleGroupBase):
    """Response with article group information"""
    id: str = Field(..., description="Group ID")
    user_id: int = Field(..., description="Owner user ID")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    columns: List[TabelizerColumnMetadata] = Field(default_factory=list, description="Column metadata")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    article_count: int = Field(..., description="Number of articles in group")


class ArticleGroupListResponse(BaseModel):
    """Response with list of article groups"""
    groups: List[ArticleGroupResponse] = Field(..., description="List of groups")
    total: int = Field(..., description="Total number of groups")


class ArticleGroupDetailResponse(ArticleGroupResponse):
    """Response with full article group details including articles and reconstructed columns"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles with extracted_features")
    columns: List[TabelizerColumnData] = Field(..., description="Reconstructed column data")


class ArticleGroupSaveResponse(BaseModel):
    """Response after saving to a group"""
    success: bool = Field(..., description="Whether save was successful")
    message: str = Field(..., description="Success or error message")
    group_id: str = Field(..., description="ID of the saved group")
    articles_saved: int = Field(..., description="Number of articles saved")


class ArticleGroupDeleteResponse(BaseModel):
    """Response after deleting a group"""
    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Success or error message")