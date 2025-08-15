"""
Smart Search Schemas

Pydantic models for the smart search lab feature.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SmartSearchRequest(BaseModel):
    """Initial search request from user"""
    question: str = Field(..., description="User's research question")
    max_results: int = Field(50, description="Maximum results to return")
    session_id: Optional[str] = Field(None, description="Optional session ID to continue existing session")


class SmartSearchRefinementResponse(BaseModel):
    """Response from question refinement step (Step 2)"""
    original_question: str = Field(..., description="Original user question")
    refined_question: str = Field(..., description="Refined, more specific question")
    session_id: str = Field(..., description="Session ID for tracking")


class SearchQueryRequest(BaseModel):
    """Request to generate search query from refined question (Step 3)"""
    refined_question: str = Field(..., description="Refined question to convert to search terms")
    session_id: str = Field(..., description="Session ID for tracking")


class SearchQueryResponse(BaseModel):
    """Response from search query generation (Step 3)"""
    refined_question: str = Field(..., description="The refined question used")
    search_query: str = Field(..., description="Boolean search query for databases")
    session_id: str = Field(..., description="Session ID for tracking")


class ArticleSearchRequest(BaseModel):
    """Request to search with boolean query"""
    search_query: str = Field(..., description="Boolean search query")
    max_results: int = Field(50, description="Maximum results per source")
    offset: int = Field(0, description="Number of results to skip (for pagination)")
    session_id: str = Field(..., description="Session ID for tracking")


class SearchPaginationInfo(BaseModel):
    """Pagination information for search results"""
    total_available: int = Field(..., description="Total number of results available")
    returned: int = Field(..., description="Number of results returned in this request")
    offset: int = Field(..., description="Number of results skipped")
    has_more: bool = Field(..., description="Whether there are more results available")


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
    pagination: SearchPaginationInfo
    sources_searched: List[str]


class DiscriminatorGenerationRequest(BaseModel):
    """Request to generate semantic discriminator prompt"""
    refined_question: str
    search_query: str
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")
    session_id: str = Field(..., description="Session ID for tracking")


class DiscriminatorGenerationResponse(BaseModel):
    """Response from discriminator generation"""
    refined_question: str
    search_query: str
    strictness: str
    discriminator_prompt: str
    session_id: str = Field(..., description="Session ID for tracking")


class SemanticFilterRequest(BaseModel):
    """Request to filter articles semantically"""
    articles: List[SearchArticle]
    refined_question: str
    search_query: str
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")
    discriminator_prompt: Optional[str] = Field(None, description="Custom discriminator prompt (optional)")
    session_id: str = Field(..., description="Session ID for tracking")


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