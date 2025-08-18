"""
Smart Search Schemas

Core domain models for the smart search feature.
These are shared data structures used across multiple services.
API-specific request/response models are defined in the router.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class SearchArticle(BaseModel):
    """Article from search results - core domain model"""
    id: str = Field(..., description="Unique identifier for the article")
    title: str
    abstract: str
    authors: List[str]
    year: int
    journal: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    url: Optional[str] = None
    source: str = Field(..., description="Source of article (pubmed, google_scholar, etc)")


class SearchPaginationInfo(BaseModel):
    """Pagination information for search results"""
    total_available: int = Field(..., description="Total number of results available")
    returned: int = Field(..., description="Number of results returned in this request")
    offset: int = Field(..., description="Number of results skipped")
    has_more: bool = Field(..., description="Whether there are more results available")


class FilteredArticle(BaseModel):
    """Article with filtering results - core domain model"""
    article: SearchArticle
    passed: bool = Field(..., description="Whether article passed the filter")
    confidence: float = Field(..., description="Confidence score 0-1")
    reasoning: str = Field(..., description="Brief explanation of decision")


class FilteringProgress(BaseModel):
    """Progress update for filtering operations"""
    total: int
    processed: int
    accepted: int
    rejected: int
    current_article: Optional[str] = None