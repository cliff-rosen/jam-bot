"""
Smart Search Schemas

Core domain models for the smart search feature.
These are shared data structures used across multiple services.
API-specific request/response models are defined in the router.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from schemas.canonical_types import CanonicalResearchArticle


class SearchPaginationInfo(BaseModel):
    """Pagination information for search results"""
    total_available: int = Field(..., description="Total number of results available")
    returned: int = Field(..., description="Number of results returned in this request")
    offset: int = Field(..., description="Number of results skipped")
    has_more: bool = Field(..., description="Whether there are more results available")


class FilteredArticle(BaseModel):
    """Article with filtering results - core domain model"""
    article: CanonicalResearchArticle
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


class SearchServiceResult(BaseModel):
    """Result from search service methods"""
    articles: List[CanonicalResearchArticle]
    pagination: SearchPaginationInfo
    sources_searched: List[str]


class OptimizedKeywordsResult(BaseModel):
    """Result from generate_optimized_search_keywords service method"""
    initial_keywords: str  # was: initial_query
    initial_count: int
    final_keywords: str    # was: final_query
    final_count: int
    refinement_description: str
    status: str  # 'optimal' | 'refined' | 'manual_needed'