"""
Search Router

This router provides REST API endpoints for web search functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from services.auth_service import validate_token
from services.search_service import SearchService
from models import ResourceCredentials, User
from schemas.canonical_types import CanonicalSearchResult
from schemas.resource import WEB_SEARCH_RESOURCE
from database import get_db
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])

# Singleton service instance
search_service = SearchService()

##########################
### Request/Response Models ###
##########################

class SearchRequest(BaseModel):
    """Request model for web search"""
    search_term: str = Field(..., description="The search term to look up on the web")
    num_results: int = Field(default=10, description="Number of search results to return", ge=1, le=50)
    date_range: str = Field(default="all", description="Date range for search results")
    region: str = Field(default="global", description="Geographic region for search results")
    language: str = Field(default="en", description="Language for search results")

class SearchResponse(BaseModel):
    """Response model for web search"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SearchStatus(BaseModel):
    """Response model for search service status"""
    authenticated: bool
    search_engine: Optional[str] = None
    credentials_configured: bool = False
    message: Optional[str] = None

##########################
### Search Endpoints ###
##########################

@router.post("/", response_model=SearchResponse)
async def perform_search(
    request: SearchRequest,
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Perform a web search using the configured search engine
    
    Args:
        request: Search request parameters
        user: Authenticated user
        db: Database session
        
    Returns:
        SearchResponse with search results and metadata
    """
    try:
        # Authenticate with search service
        if not await search_service.authenticate(user.user_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with search API. Please configure your search credentials."
            )
            
        # Perform search
        result = await search_service.search(
            search_term=request.search_term,
            num_results=request.num_results,
            date_range=request.date_range,
            region=request.region,
            language=request.language
        )
        
        return SearchResponse(
            success=True,
            data=result,
            message=f"Found {len(result.get('search_results', []))} results for '{request.search_term}'",
            metadata={
                'query_params': request.model_dump(),
                'search_engine': search_service.search_engine,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error performing search: {str(e)}")
        return SearchResponse(
            success=False,
            error=str(e),
            message=f"Search failed for '{request.search_term}'"
        )

@router.get("/status", response_model=SearchStatus)
async def get_search_status(
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get the current status of the search service
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        SearchStatus with authentication and configuration info
    """
    try:
        # Check if user has search credentials configured
        db_credentials = db.query(ResourceCredentials).filter(
            ResourceCredentials.user_id == user.user_id,
            ResourceCredentials.resource_id == WEB_SEARCH_RESOURCE.id
        ).first()
        
        credentials_configured = db_credentials is not None
        
        # Try to authenticate
        authenticated = False
        search_engine = None
        message = None
        
        if credentials_configured:
            try:
                authenticated = await search_service.authenticate(user.user_id, db)
                if authenticated:
                    search_engine = search_service.search_engine
                    message = f"Successfully authenticated with {search_engine}"
                else:
                    message = "Authentication failed with configured credentials"
            except Exception as e:
                message = f"Authentication error: {str(e)}"
        else:
            message = "No search credentials configured"
        
        return SearchStatus(
            authenticated=authenticated,
            search_engine=search_engine,
            credentials_configured=credentials_configured,
            message=message
        )
        
    except Exception as e:
        logger.error(f"Error checking search status: {str(e)}")
        return SearchStatus(
            authenticated=False,
            credentials_configured=False,
            message=f"Error checking status: {str(e)}"
        )

@router.get("/engines", response_model=List[Dict[str, Any]])
async def get_supported_search_engines(
    user = Depends(validate_token)
):
    """
    Get list of supported search engines
    
    Args:
        user: Authenticated user
        
    Returns:
        List of supported search engines with their requirements
    """
    return [
        {
            "name": "google",
            "display_name": "Google Custom Search",
            "description": "Google Custom Search API with high-quality results",
            "requires_api_key": True,
            "requires_custom_search_id": True,
            "features": ["date_range", "region", "language"],
            "rate_limits": {
                "requests_per_day": 100,
                "requests_per_second": 10
            }
        },
        {
            "name": "duckduckgo",
            "display_name": "DuckDuckGo",
            "description": "Privacy-focused search with instant answers",
            "requires_api_key": False,
            "requires_custom_search_id": False,
            "features": ["region"],
            "rate_limits": {
                "requests_per_day": 1000,
                "requests_per_second": 1
            }
        }
    ]

@router.post("/validate", response_model=SearchResponse)
async def validate_search_credentials(
    user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Validate the configured search credentials by performing a test search
    
    Args:
        user: Authenticated user
        db: Database session
        
    Returns:
        SearchResponse indicating whether credentials are valid
    """
    try:
        # Authenticate with search service
        if not await search_service.authenticate(user.user_id, db):
            return SearchResponse(
                success=False,
                error="Authentication failed",
                message="Unable to authenticate with the configured search credentials"
            )
            
        # Perform a simple test search
        test_result = await search_service.search(
            search_term="test",
            num_results=1
        )
        
        if test_result.get('search_results'):
            return SearchResponse(
                success=True,
                message=f"Credentials validated successfully with {search_service.search_engine}",
                metadata={
                    'search_engine': search_service.search_engine,
                    'test_search_time': test_result.get('search_metadata', {}).get('search_time', 0)
                }
            )
        else:
            return SearchResponse(
                success=False,
                error="No results returned",
                message="Search credentials appear to be configured but no results were returned"
            )
            
    except Exception as e:
        logger.error(f"Error validating search credentials: {str(e)}")
        return SearchResponse(
            success=False,
            error=str(e),
            message="Error validating search credentials"
        )

@router.get("/suggestions")
async def get_search_suggestions(
    query: str,
    user = Depends(validate_token)
):
    """
    Get search suggestions for a partial query (placeholder endpoint)
    
    Args:
        query: Partial search query
        user: Authenticated user
        
    Returns:
        List of search suggestions
    """
    # This is a placeholder implementation
    # In a real implementation, you might use a search suggestion API
    # or generate suggestions based on search history
    
    if not query or len(query) < 2:
        return {"suggestions": []}
    
    # Simple suggestions based on common search patterns
    suggestions = [
        f"{query} 2024",
        f"{query} guide",
        f"{query} tutorial",
        f"{query} examples",
        f"{query} best practices"
    ]
    
    return {"suggestions": suggestions[:5]}

##########################
### Search History (Optional) ###
##########################

# Note: These endpoints would require a search history table in the database
# For now, they're commented out as placeholders

# @router.get("/history", response_model=List[Dict[str, Any]])
# async def get_search_history(
#     user = Depends(validate_token),
#     db: Session = Depends(get_db),
#     limit: int = 10
# ):
#     """Get recent search history for the user"""
#     # Implementation would query a search_history table
#     return []

# @router.delete("/history/{search_id}")
# async def delete_search_history_item(
#     search_id: str,
#     user = Depends(validate_token),
#     db: Session = Depends(get_db)
# ):
#     """Delete a specific search history item"""
#     # Implementation would delete from search_history table
#     return {"message": "Search history item deleted"} 