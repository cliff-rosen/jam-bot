"""
Smart Search Schemas

Pydantic models for the smart search lab feature.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SmartSearchRequest(BaseModel):
    """Initial search request from user"""
    query: str = Field(..., description="User's document search query")
    max_results: int = Field(50, description="Maximum results to return")
    session_id: Optional[str] = Field(None, description="Optional session ID to continue existing session")


class SmartSearchRefinementResponse(BaseModel):
    """Response from evidence specification step (Step 2)"""
    original_query: str = Field(..., description="Original user query")
    evidence_specification: str = Field(..., description="Evidence specification for document search")
    session_id: str = Field(..., description="Session ID for tracking")


class SearchQueryRequest(BaseModel):
    """Request to generate search keywords from evidence specification (Step 3)"""
    evidence_specification: str = Field(..., description="Evidence specification to convert to search terms")
    session_id: str = Field(..., description="Session ID for tracking")


class SearchQueryResponse(BaseModel):
    """Response from search keyword generation (Step 3)"""
    evidence_specification: str = Field(..., description="The evidence specification used")
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
    evidence_specification: str
    search_query: str
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")
    session_id: str = Field(..., description="Session ID for tracking")


class DiscriminatorGenerationResponse(BaseModel):
    """Response from discriminator generation"""
    evidence_specification: str
    search_query: str
    strictness: str
    discriminator_prompt: str
    session_id: str = Field(..., description="Session ID for tracking")


class SemanticFilterRequest(BaseModel):
    """Request to filter articles semantically"""
    articles: List[SearchArticle]
    evidence_specification: str
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


class SessionResetRequest(BaseModel):
    """Request to reset session to specific step"""
    step: str = Field(..., description="Step to reset to: question_input, question_refinement, etc.")


class FilterAllSearchResultsRequest(BaseModel):
    """Request to filter all available search results without downloading them first"""
    search_query: str = Field(..., description="Boolean search query to execute")
    evidence_specification: str = Field(..., description="Evidence specification for context")
    max_results: int = Field(500, description="Maximum results to retrieve and filter")
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")
    discriminator_prompt: Optional[str] = Field(None, description="Custom discriminator prompt (optional)")
    session_id: str = Field(..., description="Session ID for tracking")


class UnifiedFilterRequest(BaseModel):
    """Unified request for filtering articles - supports both selected and all modes"""
    filter_mode: str = Field(..., description="Filter mode: 'selected' or 'all'")
    
    # Common fields
    evidence_specification: str = Field(..., description="Evidence specification for context")
    search_query: str = Field(..., description="Boolean search query")
    strictness: str = Field("medium", description="Filtering strictness: low, medium, high")
    discriminator_prompt: Optional[str] = Field(None, description="Custom discriminator prompt (optional)")
    session_id: str = Field(..., description="Session ID for tracking")
    
    # For selected mode
    articles: Optional[List[SearchArticle]] = Field(None, description="Articles to filter (required for selected mode)")
    
    # For all mode
    max_results: Optional[int] = Field(500, description="Maximum results to retrieve and filter (for all mode)")


class ParallelFilterResponse(BaseModel):
    """Response from parallel (non-streaming) filtering"""
    filtered_articles: List[FilteredArticle]
    total_processed: int
    total_accepted: int
    total_rejected: int
    average_confidence: float
    duration_seconds: float
    token_usage: Dict[str, int] = Field(..., description="Token usage statistics")
    session_id: str