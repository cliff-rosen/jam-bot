"""
Smart Search Router

API endpoints for smart search functionality in the lab.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from schemas.smart_search import (
    SmartSearchRequest,
    SmartSearchRefinementResponse,
    SearchQueryRequest,
    SearchQueryResponse,
    ArticleSearchRequest,
    SearchResultsResponse,
    SemanticFilterRequest
)
from services.auth_service import validate_token
from services.smart_search_service import SmartSearchService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/lab/smart-search",
    tags=["smart-search"],
    dependencies=[Depends(validate_token)]
)


@router.post("/refine", response_model=SmartSearchRefinementResponse)
async def refine_search_query(
    request: SmartSearchRequest,
    current_user = Depends(validate_token)
) -> SmartSearchRefinementResponse:
    """
    Step 2: Refine user's research question
    """
    try:
        logger.info(f"User {current_user.user_id} refining search query: {request.query[:100]}...")
        
        service = SmartSearchService()
        refined_query = await service.refine_search_query(request.query)
        
        response = SmartSearchRefinementResponse(
            original_query=request.query,
            refined_query=refined_query
        )
        
        logger.info(f"Query refinement completed for user {current_user.user_id}")
        return response
        
    except Exception as e:
        logger.error(f"Query refinement failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query refinement failed: {str(e)}")


@router.post("/generate-query", response_model=SearchQueryResponse)
async def generate_search_query(
    request: SearchQueryRequest,
    current_user = Depends(validate_token)
) -> SearchQueryResponse:
    """
    Step 3: Generate boolean search query from refined question
    """
    try:
        logger.info(f"User {current_user.user_id} generating search query from: {request.refined_query[:100]}...")
        
        service = SmartSearchService()
        search_query = await service.generate_search_query(request.refined_query)
        
        response = SearchQueryResponse(
            refined_query=request.refined_query,
            search_query=search_query
        )
        
        logger.info(f"Search query generation completed for user {current_user.user_id}")
        return response
        
    except Exception as e:
        logger.error(f"Search query generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search query generation failed: {str(e)}")


@router.post("/execute", response_model=SearchResultsResponse)
async def execute_search(
    request: ArticleSearchRequest,
    current_user = Depends(validate_token)
) -> SearchResultsResponse:
    """
    Step 4: Execute search with boolean query
    """
    try:
        logger.info(f"User {current_user.user_id} executing search with query: {request.search_query[:100]}...")
        
        service = SmartSearchService()
        response = await service.search_articles(
            search_query=request.search_query,
            max_results=request.max_results
        )
        
        logger.info(f"Search completed for user {current_user.user_id}: {response.total_found} articles found")
        return response
        
    except Exception as e:
        logger.error(f"Search execution failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search execution failed: {str(e)}")


@router.post("/filter-stream")
async def filter_articles_stream(
    request: SemanticFilterRequest,
    current_user = Depends(validate_token)
):
    """
    Filter articles with semantic discriminator (streaming)
    """
    try:
        logger.info(f"User {current_user.user_id} starting article filtering for {len(request.articles)} articles")
        
        service = SmartSearchService()
        
        async def generate():
            try:
                async for message in service.filter_articles_streaming(
                    articles=request.articles,
                    refined_query=request.refined_query,
                    search_query=request.search_query,
                    strictness=request.strictness
                ):
                    yield message
            except Exception as e:
                logger.error(f"Filtering error for user {current_user.user_id}: {e}", exc_info=True)
                # Send error message in SSE format
                import json
                from datetime import datetime
                error_message = {
                    "type": "error",
                    "message": f"Filtering failed: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat()
                }
                yield f"data: {json.dumps(error_message)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to start filtering for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start filtering: {str(e)}")