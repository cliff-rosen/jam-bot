"""
Smart Search Schemas

Pydantic models for the smart search lab feature.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SmartSearchRequest(BaseModel):
    """Initial search request from user"""
    query: str = Field(..., description="User's research question")
    max_results: int = Field(50, description="Maximum results to return")


class SmartSearchRefinementResponse(BaseModel):
    """Response from query refinement step"""
    original_query: str = Field(..., description="Original user query")
    refined_query: str = Field(..., description="Refined, more specific query")
    keywords: List[str] = Field(..., description="Search keywords extracted")
    search_strategy: str = Field(..., description="Brief explanation of search approach")


class KeywordSearchRequest(BaseModel):
    """Request to search with keywords"""
    keywords: List[str] = Field(..., description="Keywords to search")
    max_results: int = Field(50, description="Maximum results per source")


class SearchArticle(BaseModel):
    """Article from search results"""
    title: str
    abstract: str
    authors: List[str]
    year: int
    journal: Optional[str] = None
    doi: Optional[str] = None
    pmid: Optional[str] = None
    url: Optional[str] = None
    source: str = Field(..., description="Source of article (pubmed, google_scholar, etc)")


class SearchResultsResponse(BaseModel):
    """Response from article search"""
    articles: List[SearchArticle]
    total_found: int
    sources_searched: List[str]


class SemanticFilterRequest(BaseModel):
    """Request to filter articles semantically"""
    articles: List[SearchArticle]
    refined_query: str
    keywords: List[str]
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")


class FilteredArticle(BaseModel):
    """Article with filtering results"""
    article: SearchArticle
    passed: bool = Field(..., description="Whether article passed the filter")
    confidence: float = Field(..., description="Confidence score 0-1")
    reasoning: str = Field(..., description="Brief explanation of decision")


class FilteringProgress(BaseModel):
    """Progress update for filtering"""
    total: int
    processed: int
    accepted: int
    rejected: int
    current_article: Optional[str] = None


class FilteringCompleteResponse(BaseModel):
    """Final filtering results"""
    filtered_articles: List[FilteredArticle]
    total_processed: int
    total_accepted: int
    total_rejected: int
    average_confidence: float