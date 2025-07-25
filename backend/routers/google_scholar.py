"""
Google Scholar API Router

This module provides REST API endpoints for Google Scholar search functionality.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import User

from schemas.canonical_types import CanonicalScholarArticle

from services.auth_service import validate_token
from services.google_scholar_service import get_google_scholar_service

router = APIRouter(
    prefix="/google-scholar",
    tags=["google-scholar"]
)


class GoogleScholarSearchRequest(BaseModel):
    """Request model for Google Scholar search."""
    query: str = Field(..., description="Search query for academic literature")
    num_results: Optional[int] = Field(10, ge=1, le=20, description="Number of results to return")
    year_low: Optional[int] = Field(None, description="Filter results from this year onwards")
    year_high: Optional[int] = Field(None, description="Filter results up to this year")
    sort_by: Optional[str] = Field("relevance", pattern="^(relevance|date)$", description="Sort order")


class GoogleScholarSearchResponse(BaseModel):
    """Response model for Google Scholar search."""
    articles: list[CanonicalScholarArticle] = Field(..., description="List of academic articles")
    metadata: dict = Field(..., description="Search metadata")
    success: bool = Field(..., description="Whether the search was successful")


@router.post("/search", response_model=GoogleScholarSearchResponse)
async def search_google_scholar(
    request: GoogleScholarSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """
    Search Google Scholar for academic articles.
    
    This endpoint provides access to Google Scholar search functionality,
    allowing users to find academic literature across all disciplines.
    
    Args:
        request: Search parameters
        db: Database session
        current_user: Authenticated user
        
    Returns:
        GoogleScholarSearchResponse with articles and metadata
        
    Raises:
        HTTPException: If search fails or parameters are invalid
    """
    try:
        # Get the service
        service = get_google_scholar_service()
        
        # Perform the search
        articles, search_metadata = service.search_articles(
            query=request.query,
            num_results=request.num_results,
            year_low=request.year_low,
            year_high=request.year_high,
            sort_by=request.sort_by
        )
        
        return GoogleScholarSearchResponse(
            articles=articles,
            metadata=search_metadata,
            success=True
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/search", response_model=GoogleScholarSearchResponse)
async def search_google_scholar_get(
    query: str = Query(..., description="Search query"),
    num_results: Optional[int] = Query(10, ge=1, le=20, description="Number of results"),
    year_low: Optional[int] = Query(None, description="Start year filter"),
    year_high: Optional[int] = Query(None, description="End year filter"),
    sort_by: Optional[str] = Query("relevance", pattern="^(relevance|date)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """
    Search Google Scholar (GET method).
    
    Same as POST /search but using query parameters.
    Useful for simple searches or browser testing.
    """
    request = GoogleScholarSearchRequest(
        query=query,
        num_results=num_results,
        year_low=year_low,
        year_high=year_high,
        sort_by=sort_by
    )
    
    return await search_google_scholar(request, db, current_user)


@router.get("/test-connection")
async def test_google_scholar_connection(
    current_user: User = Depends(validate_token)
):
    """
    Test Google Scholar/SerpAPI connection.
    
    Verifies that the SerpAPI key is configured and the service is accessible.
    """
    try:
        service = get_google_scholar_service()
        
        # Check if API key is configured
        if not service.api_key:
            return {
                "status": "error",
                "message": "SerpAPI key not configured. Set SERPAPI_KEY environment variable."
            }
        
        # Try a minimal search to test the connection
        try:
            articles, metadata = service.search_articles(
                query="test",
                num_results=1
            )
            return {
                "status": "success",
                "message": "Google Scholar connection successful",
                "api_configured": True,
                "test_results": len(articles)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection test failed: {str(e)}",
                "api_configured": True
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Service initialization failed: {str(e)}",
            "api_configured": False
        }