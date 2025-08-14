"""
Smart Search Router

API endpoints for smart search functionality in the lab.
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime

from schemas.smart_search import (
    SmartSearchRequest,
    SmartSearchRefinementResponse,
    SearchQueryRequest,
    SearchQueryResponse,
    ArticleSearchRequest,
    SearchResultsResponse,
    DiscriminatorGenerationRequest,
    DiscriminatorGenerationResponse,
    SemanticFilterRequest
)
from services.auth_service import validate_token
from services.smart_search_service import SmartSearchService
from models import SmartSearchSession
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/lab/smart-search",
    tags=["smart-search"],
    dependencies=[Depends(validate_token)]
)


@router.post("/refine", response_model=SmartSearchRefinementResponse)
async def refine_research_question(
    request: SmartSearchRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> SmartSearchRefinementResponse:
    """
    Step 2: Refine user's research question
    """
    try:
        logger.info(f"User {current_user.user_id} refining research question: {request.question[:100]}...")
        
        # Create or get existing session
        session = None
        if request.session_id:
            session = db.query(SmartSearchSession).filter(
                SmartSearchSession.id == request.session_id,
                SmartSearchSession.user_id == current_user.user_id
            ).first()
        
        if not session:
            session = SmartSearchSession(
                user_id=current_user.user_id,
                original_question=request.question,
                status="in_progress",
                last_step_completed="question_input"
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        
        service = SmartSearchService()
        refined_question = await service.refine_research_question(request.question)
        
        # Update session with refinement results
        session.refined_question = refined_question
        session.last_step_completed = "question_refinement"
        session.total_api_calls = (session.total_api_calls or 0) + 1
        db.commit()
        
        response = SmartSearchRefinementResponse(
            original_question=request.question,
            refined_question=refined_question,
            session_id=session.id
        )
        
        logger.info(f"Query refinement completed for user {current_user.user_id}, session {session.id}")
        return response
        
    except Exception as e:
        logger.error(f"Query refinement failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query refinement failed: {str(e)}")


@router.post("/generate-query", response_model=SearchQueryResponse)
async def generate_search_query(
    request: SearchQueryRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> SearchQueryResponse:
    """
    Step 3: Generate boolean search query from refined question
    """
    try:
        logger.info(f"User {current_user.user_id} generating search query from: {request.refined_question[:100]}...")
        
        # Get session
        session = db.query(SmartSearchSession).filter(
            SmartSearchSession.id == request.session_id,
            SmartSearchSession.user_id == current_user.user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        service = SmartSearchService()
        search_query = await service.generate_search_query(request.refined_question)
        
        # Update session
        session.submitted_refined_question = request.refined_question
        session.generated_search_query = search_query
        session.last_step_completed = "search_query_generation"
        session.total_api_calls = (session.total_api_calls or 0) + 1
        db.commit()
        
        response = SearchQueryResponse(
            refined_question=request.refined_question,
            search_query=search_query,
            session_id=session.id
        )
        
        logger.info(f"Search query generation completed for user {current_user.user_id}, session {session.id}")
        return response
        
    except Exception as e:
        logger.error(f"Search query generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search query generation failed: {str(e)}")


@router.post("/execute", response_model=SearchResultsResponse)
async def execute_search(
    request: ArticleSearchRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> SearchResultsResponse:
    """
    Step 4: Execute search with boolean query
    """
    try:
        logger.info(f"User {current_user.user_id} executing search with query: {request.search_query[:100]}...")
        
        # Get session
        session = db.query(SmartSearchSession).filter(
            SmartSearchSession.id == request.session_id,
            SmartSearchSession.user_id == current_user.user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        service = SmartSearchService()
        response = await service.search_articles(
            search_query=request.search_query,
            max_results=request.max_results,
            offset=request.offset
        )
        
        # Update session with search metadata
        session.submitted_search_query = request.search_query
        
        # Combine with existing search metadata for pagination tracking
        existing_metadata = session.search_metadata or {}
        search_metadata = {
            "total_available": response.pagination.total_available,
            "total_retrieved": existing_metadata.get("total_retrieved", 0) + response.pagination.returned,
            "sources_searched": response.sources_searched,
            "last_search_timestamp": datetime.utcnow().isoformat(),
            "pagination_loads": existing_metadata.get("pagination_loads", 0) + 1
        }
        
        session.search_metadata = search_metadata
        session.articles_retrieved_count = search_metadata["total_retrieved"]
        session.last_step_completed = "search_execution"
        db.commit()
        
        logger.info(f"Search completed for user {current_user.user_id}, session {session.id}: {response.pagination.returned} articles found, {response.pagination.total_available} total available")
        return response
        
    except Exception as e:
        logger.error(f"Search execution failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search execution failed: {str(e)}")


@router.post("/generate-discriminator", response_model=DiscriminatorGenerationResponse)
async def generate_semantic_discriminator(
    request: DiscriminatorGenerationRequest,
    current_user = Depends(validate_token)
):
    """
    Generate semantic discriminator prompt for review
    """
    try:
        logger.info(f"User {current_user.user_id} generating semantic discriminator")
        
        service = SmartSearchService()
        discriminator_prompt = await service.generate_semantic_discriminator(
            refined_question=request.refined_question,
            search_query=request.search_query,
            strictness=request.strictness
        )
        
        response = DiscriminatorGenerationResponse(
            refined_question=request.refined_question,
            search_query=request.search_query,
            strictness=request.strictness,
            discriminator_prompt=discriminator_prompt
        )
        
        logger.info(f"Discriminator generation completed for user {current_user.user_id}")
        return response
        
    except Exception as e:
        logger.error(f"Discriminator generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Discriminator generation failed: {str(e)}")


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
                    refined_question=request.refined_question,
                    search_query=request.search_query,
                    strictness=request.strictness,
                    custom_discriminator=request.discriminator_prompt
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


@router.get("/sessions")
async def get_search_sessions(
    current_user = Depends(validate_token),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """
    Get user's smart search session history
    """
    try:
        sessions = db.query(SmartSearchSession).filter(
            SmartSearchSession.user_id == current_user.user_id
        ).order_by(SmartSearchSession.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            "sessions": [session.to_dict() for session in sessions],
            "total": db.query(SmartSearchSession).filter(
                SmartSearchSession.user_id == current_user.user_id
            ).count()
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve sessions for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sessions: {str(e)}")


@router.get("/sessions/{session_id}")
async def get_search_session(
    session_id: str,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Get specific smart search session details
    """
    try:
        session = db.query(SmartSearchSession).filter(
            SmartSearchSession.id == session_id,
            SmartSearchSession.user_id == current_user.user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve session {session_id} for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve session: {str(e)}")