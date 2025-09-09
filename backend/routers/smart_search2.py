"""
SmartSearch2 Router

Direct search endpoints for SmartSearch2 - no session management required.
Optimized for simple, direct search functionality.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from schemas.canonical_types import CanonicalResearchArticle
from schemas.smart_search import SearchPaginationInfo
from schemas.workbench import FeatureDefinition
from services.auth_service import validate_token
from services.smart_search_service import SmartSearchService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/smart-search-2",
    tags=["smart-search-2"],
    dependencies=[Depends(validate_token)]
)

# ============================================================================
# API Request/Response Models
# ============================================================================

class DirectSearchRequest(BaseModel):
    """Request for direct search without session management"""
    query: str = Field(..., description="Search query")
    source: str = Field(..., description="Search source: 'pubmed' or 'google_scholar'")
    max_results: int = Field(50, ge=1, le=100, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")

class DirectSearchResponse(BaseModel):
    """Response from direct search"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Search results")
    pagination: SearchPaginationInfo = Field(..., description="Pagination information")
    source: str = Field(..., description="Source that was searched")
    query: str = Field(..., description="Query that was executed")

class EvidenceSpecRequest(BaseModel):
    """Request for evidence specification generation"""
    query: str = Field(..., description="User's research question")

class EvidenceSpecResponse(BaseModel):
    """Response from evidence specification generation"""
    original_query: str = Field(..., description="Original user query")
    evidence_specification: str = Field(..., description="Generated evidence specification")

class KeywordGenerationRequest(BaseModel):
    """Request for keyword generation"""
    evidence_specification: str = Field(..., description="Evidence specification to generate keywords from")
    source: str = Field(..., description="Target source: 'pubmed' or 'google_scholar'")

class KeywordGenerationResponse(BaseModel):
    """Response from keyword generation"""
    evidence_specification: str = Field(..., description="Input evidence specification")
    search_keywords: str = Field(..., description="Generated search keywords")
    source: str = Field(..., description="Target source")

class FeatureExtractionRequest(BaseModel):
    """Request for feature extraction from articles"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles to extract features from")
    features: List[FeatureDefinition] = Field(..., description="Feature definitions to extract")

class FeatureExtractionResponse(BaseModel):
    """Response from feature extraction"""
    results: dict = Field(..., description="Extracted features: article_id -> feature_name -> value")
    extraction_metadata: dict = Field(..., description="Metadata about the extraction process")

# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/search", response_model=DirectSearchResponse)
async def search(
    request: DirectSearchRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> DirectSearchResponse:
    """
    Direct search without session management - optimized for SmartSearch2
    
    This endpoint provides direct access to search functionality without
    requiring the full SmartSearch workflow or session management.
    
    Args:
        request: Search parameters
        current_user: Authenticated user
        db: Database session
        
    Returns:
        DirectSearchResponse with articles and metadata
        
    Raises:
        HTTPException: If search fails or parameters are invalid
    """
    try:
        logger.info(f"User {current_user.user_id} direct search: '{request.query[:100]}...' in {request.source}")
        
        # Validate source
        if request.source not in ['pubmed', 'google_scholar']:
            raise HTTPException(status_code=400, detail="Source must be 'pubmed' or 'google_scholar'")
        
        # Execute search using SmartSearchService.search_articles (no session required)
        service = SmartSearchService()
        result = await service.search_articles(
            search_query=request.query,
            max_results=request.max_results,
            offset=request.offset,
            selected_sources=[request.source]
        )
        
        return DirectSearchResponse(
            articles=result.articles,
            pagination=result.pagination,
            source=request.source,
            query=request.query
        )
        
    except ValueError as e:
        logger.error(f"Direct search validation error for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Direct search failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/evidence-spec", response_model=EvidenceSpecResponse)
async def create_evidence_spec(
    request: EvidenceSpecRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> EvidenceSpecResponse:
    """
    Generate evidence specification from user's research question.
    
    This is a simplified version of the evidence specification generation
    that doesn't require session management - perfect for SmartSearch2.
    
    Args:
        request: Evidence specification request
        current_user: Authenticated user
        db: Database session
        
    Returns:
        EvidenceSpecResponse with generated specification
        
    Raises:
        HTTPException: If generation fails
    """
    try:
        logger.info(f"User {current_user.user_id} evidence spec generation: '{request.query[:100]}...'")
        
        # Use SmartSearchService to generate evidence specification
        service = SmartSearchService()
        evidence_spec, usage = await service.create_evidence_specification(request.query)
        
        logger.info(f"Evidence spec generated for user {current_user.user_id}, tokens used: {usage.total_tokens}")
        
        return EvidenceSpecResponse(
            original_query=request.query,
            evidence_specification=evidence_spec
        )
        
    except Exception as e:
        logger.error(f"Evidence specification generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evidence specification generation failed: {str(e)}")


@router.post("/generate-keywords", response_model=KeywordGenerationResponse)
async def generate_keywords(
    request: KeywordGenerationRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> KeywordGenerationResponse:
    """
    Generate search keywords from evidence specification.
    
    This is a simplified version of keyword generation that doesn't require
    session management - perfect for SmartSearch2.
    
    Args:
        request: Keyword generation request
        current_user: Authenticated user
        db: Database session
        
    Returns:
        KeywordGenerationResponse with generated keywords
        
    Raises:
        HTTPException: If generation fails
    """
    try:
        logger.info(f"User {current_user.user_id} keyword generation for source: {request.source}")
        
        # Validate source
        if request.source not in ['pubmed', 'google_scholar']:
            raise HTTPException(status_code=400, detail="Source must be 'pubmed' or 'google_scholar'")
        
        # Use SmartSearchService to generate keywords
        service = SmartSearchService()
        search_keywords, usage = await service.generate_search_keywords(
            evidence_specification=request.evidence_specification,
            selected_sources=[request.source]
        )
        
        logger.info(f"Keywords generated for user {current_user.user_id}, tokens used: {usage.total_tokens}")
        
        return KeywordGenerationResponse(
            evidence_specification=request.evidence_specification,
            search_keywords=search_keywords,
            source=request.source
        )
        
    except Exception as e:
        logger.error(f"Keyword generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Keyword generation failed: {str(e)}")


@router.post("/extract-features", response_model=FeatureExtractionResponse)
async def extract_features(
    request: FeatureExtractionRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> FeatureExtractionResponse:
    """
    Extract AI features from articles without session management.
    
    This endpoint allows direct feature extraction from a list of articles
    using custom AI features - perfect for SmartSearch2's session-less approach.
    
    Args:
        request: Feature extraction request with articles and feature definitions
        current_user: Authenticated user
        db: Database session
        
    Returns:
        FeatureExtractionResponse with extracted feature data
        
    Raises:
        HTTPException: If extraction fails
    """
    try:
        logger.info(f"User {current_user.user_id} extracting {len(request.features)} features from {len(request.articles)} articles")
        
        if not request.features:
            raise HTTPException(status_code=400, detail="At least one feature definition is required")
        
        if not request.articles:
            raise HTTPException(status_code=400, detail="At least one article is required")
        
        # Convert articles to dict format expected by the service
        articles_dict = []
        for article in request.articles:
            article_dict = {
                'id': article.id,
                'title': article.title,
                'abstract': article.abstract or "",
                'authors': article.authors,
                'journal': article.journal,
                'publication_date': article.publication_date.isoformat() if article.publication_date else None,
                'url': article.url
            }
            articles_dict.append(article_dict)
        
        # Use SmartSearchService to extract features
        service = SmartSearchService()
        results = await service.extract_features_parallel(
            articles=articles_dict,
            features=request.features
        )
        
        # Calculate metadata
        extraction_metadata = {
            'total_articles': len(request.articles),
            'features_extracted': len(request.features),
            'successful_extractions': len(results)
        }
        
        logger.info(f"Feature extraction completed for user {current_user.user_id}: {len(results)} successful extractions")
        
        return FeatureExtractionResponse(
            results=results,
            extraction_metadata=extraction_metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feature extraction failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}")
