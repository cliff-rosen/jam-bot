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

from models import SmartSearchSession
from database import get_db

from schemas.smart_search import (
    SmartSearchRequest,
    SmartSearchRefinementResponse,
    SearchQueryRequest,
    SearchQueryResponse,
    ArticleSearchRequest,
    SearchResultsResponse,
    DiscriminatorGenerationRequest,
    DiscriminatorGenerationResponse,
    SemanticFilterRequest,
    SessionResetRequest,
    FilterAllSearchResultsRequest
)

from services.auth_service import validate_token
from services.smart_search_service import SmartSearchService
from services.smart_search_session_service import SmartSearchSessionService

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
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get or create session
        session = session_service.get_or_create_session(
            user_id=current_user.user_id,
            original_question=request.question,
            session_id=request.session_id
        )
        
        # Refine the question
        service = SmartSearchService()
        refined_question, usage = await service.refine_research_question(request.question)
        
        # Update session with refinement results
        session_service.update_refinement_step(
            session_id=session.id,
            user_id=current_user.user_id,
            refined_question=refined_question,
            submitted_refined_question=None,  # Will be set when user actually submits in next step
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens
        )
        
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
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate search query
        service = SmartSearchService()
        search_query, usage = await service.generate_search_query(request.refined_question)
        
        # Update session - this is when user actually submits their refined question
        session_service.update_search_query_step(
            session_id=session.id,
            user_id=current_user.user_id,
            generated_search_query=search_query,
            submitted_search_query=None,  # Will be set when user actually executes search
            submitted_refined_question=request.refined_question,  # What user actually submitted
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens
        )
        
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
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Execute search
        service = SmartSearchService()
        response = await service.search_articles(
            search_query=request.search_query,
            max_results=request.max_results,
            offset=request.offset
        )
        
        # Update session with search metadata
        is_pagination_load = request.offset > 0
        session_service.update_search_execution_step(
            session_id=session.id,
            user_id=current_user.user_id,
            total_available=response.pagination.total_available,
            returned=response.pagination.returned,
            sources=response.sources_searched,
            is_pagination_load=is_pagination_load,
            submitted_search_query=request.search_query
        )
        
        logger.info(f"Search completed for user {current_user.user_id}, session {session.id}: {response.pagination.returned} articles found, {response.pagination.total_available} total available")
        return response
        
    except Exception as e:
        logger.error(f"Search execution failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search execution failed: {str(e)}")


@router.post("/generate-discriminator", response_model=DiscriminatorGenerationResponse)
async def generate_semantic_discriminator(
    request: DiscriminatorGenerationRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Generate semantic discriminator prompt for review
    """
    try:
        logger.info(f"User {current_user.user_id} generating semantic discriminator")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate discriminator
        service = SmartSearchService()
        discriminator_prompt = await service.generate_semantic_discriminator(
            refined_question=request.refined_question,
            search_query=request.search_query,
            strictness=request.strictness
        )
        
        # Update session
        session_service.update_discriminator_step(
            session_id=session.id,
            user_id=current_user.user_id,
            generated_discriminator=discriminator_prompt,
            submitted_discriminator=None,  # Will be set when user actually starts filtering
            strictness=request.strictness
        )
        
        response = DiscriminatorGenerationResponse(
            refined_question=request.refined_question,
            search_query=request.search_query,
            strictness=request.strictness,
            discriminator_prompt=discriminator_prompt,
            session_id=session.id
        )
        
        logger.info(f"Discriminator generation completed for user {current_user.user_id}, session {session.id}")
        return response
        
    except Exception as e:
        logger.error(f"Discriminator generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Discriminator generation failed: {str(e)}")


@router.post("/filter-stream")
async def filter_articles_stream(
    request: SemanticFilterRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Filter articles with semantic discriminator (streaming)
    """
    try:
        logger.info(f"User {current_user.user_id} starting article filtering for {len(request.articles)} articles")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session and update article selection
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Track article selection
        session_service.update_article_selection_step(
            session_id=session.id,
            user_id=current_user.user_id,
            selected_count=len(request.articles)
        )
        
        service = SmartSearchService()
        
        # Determine which discriminator will be used
        actual_discriminator = request.discriminator_prompt
        if not actual_discriminator:
            # Generate default discriminator if none provided
            actual_discriminator = await service.generate_semantic_discriminator(
                refined_question=request.refined_question,
                search_query=request.search_query,
                strictness=request.strictness
            )
        
        # Track filtering stats for session update
        filtering_stats = {
            "total_filtered": 0,
            "accepted": 0,
            "rejected": 0,
            "start_time": datetime.utcnow(),
            "actual_discriminator": actual_discriminator
        }
        
        async def generate():
            try:
                async for message in service.filter_articles_streaming(
                    articles=request.articles,
                    refined_question=request.refined_question,
                    search_query=request.search_query,
                    strictness=request.strictness,
                    custom_discriminator=request.discriminator_prompt
                ):
                    # Parse and track filtering progress
                    import json
                    if message.startswith("data: "):
                        try:
                            data = json.loads(message[6:])
                            if data.get("type") == "complete":
                                # Update final session stats
                                stats = data.get("data", {})
                                filtering_stats["total_filtered"] = stats.get("total_processed", 0)
                                filtering_stats["accepted"] = stats.get("accepted", 0)
                                filtering_stats["rejected"] = stats.get("rejected", 0)
                                
                                # Extract token usage from completion data
                                token_usage = stats.get("token_usage", {})
                                filtering_stats["prompt_tokens"] = token_usage.get("prompt_tokens", 0)
                                filtering_stats["completion_tokens"] = token_usage.get("completion_tokens", 0)
                                filtering_stats["total_tokens"] = token_usage.get("total_tokens", 0)
                                
                                # Calculate duration and average confidence
                                duration = datetime.utcnow() - filtering_stats["start_time"]
                                duration_seconds = int(duration.total_seconds())
                                
                                # Update session with final results
                                avg_confidence = 0.5  # Default fallback
                                if filtering_stats["accepted"] > 0:
                                    # This would need to be calculated from actual filtered articles
                                    avg_confidence = 0.7  # Placeholder
                                
                                # Create new database session for the update
                                db_gen = get_db()
                                new_db = next(db_gen)
                                try:
                                    new_session_service = SmartSearchSessionService(new_db)
                                    new_session_service.update_filtering_step(
                                        session_id=session.id,
                                        user_id=current_user.user_id,
                                        total_filtered=filtering_stats["total_filtered"],
                                        accepted=filtering_stats["accepted"],
                                        rejected=filtering_stats["rejected"],
                                        average_confidence=avg_confidence,
                                        duration_seconds=duration_seconds,
                                        submitted_discriminator=filtering_stats["actual_discriminator"],
                                        prompt_tokens=filtering_stats["prompt_tokens"],
                                        completion_tokens=filtering_stats["completion_tokens"],
                                        total_tokens=filtering_stats["total_tokens"]
                                    )
                                finally:
                                    new_db.close()
                        except Exception as parse_error:
                            logger.warning(f"Failed to parse filtering message: {parse_error}")
                    
                    yield message
                    
            except Exception as e:
                logger.error(f"Filtering error for user {current_user.user_id}: {e}", exc_info=True)
                # Send error message in SSE format
                import json
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


@router.post("/filter-all-stream")
async def filter_all_search_results_stream(
    request: FilterAllSearchResultsRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Execute a full search and filter all results in one operation (streaming)
    This is used when user wants to filter all available results without downloading them first
    """
    try:
        logger.info(f"User {current_user.user_id} starting filter-all for query: {request.search_query[:100]}...")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Initialize smart search service
        service = SmartSearchService()
        
        # Execute full search to get all available articles
        logger.info(f"Executing full search with max_results={request.max_results}")
        search_results = await service.search_articles(
            search_query=request.search_query,
            max_results=request.max_results,
            offset=0
        )
        
        logger.info(f"Retrieved {len(search_results.articles)} articles for filtering")
        
        # Update session with search execution (full retrieval)
        session_service.update_search_execution_step(
            session_id=session.id,
            user_id=current_user.user_id,
            total_available=search_results.pagination.total_available,
            returned=len(search_results.articles),
            sources=search_results.sources_searched,
            is_pagination_load=False,
            submitted_search_query=request.search_query
        )
        
        # Track article selection (all articles selected for filtering)
        session_service.update_article_selection_step(
            session_id=session.id,
            user_id=current_user.user_id,
            selected_count=len(search_results.articles)
        )
        
        # Determine which discriminator to use
        actual_discriminator = request.discriminator_prompt
        if not actual_discriminator:
            # Generate default discriminator if none provided
            actual_discriminator = await service.generate_semantic_discriminator(
                refined_question=request.refined_question,
                search_query=request.search_query,
                strictness=request.strictness
            )
        
        # Track filtering stats for session update
        filtering_stats = {
            "total_filtered": 0,
            "accepted": 0,
            "rejected": 0,
            "start_time": datetime.utcnow(),
            "actual_discriminator": actual_discriminator
        }
        
        async def generate():
            try:
                # Stream the filtering process
                async for message in service.filter_articles_streaming(
                    articles=search_results.articles,
                    refined_question=request.refined_question,
                    search_query=request.search_query,
                    strictness=request.strictness,
                    custom_discriminator=actual_discriminator
                ):
                    # Parse and track filtering progress
                    import json
                    if message.startswith("data: "):
                        try:
                            data = json.loads(message[6:])
                            if data.get("type") == "complete":
                                # Update final session stats
                                stats = data.get("data", {})
                                filtering_stats["total_filtered"] = stats.get("total_processed", 0)
                                filtering_stats["accepted"] = stats.get("accepted", 0)
                                filtering_stats["rejected"] = stats.get("rejected", 0)
                                
                                # Extract token usage from completion data
                                token_usage = stats.get("token_usage", {})
                                filtering_stats["prompt_tokens"] = token_usage.get("prompt_tokens", 0)
                                filtering_stats["completion_tokens"] = token_usage.get("completion_tokens", 0)
                                filtering_stats["total_tokens"] = token_usage.get("total_tokens", 0)
                                
                                # Calculate duration and average confidence
                                duration = datetime.utcnow() - filtering_stats["start_time"]
                                duration_seconds = int(duration.total_seconds())
                                
                                # Update session with final results
                                avg_confidence = 0.5  # Default fallback
                                if filtering_stats["accepted"] > 0:
                                    avg_confidence = 0.7  # Placeholder
                                
                                # Create new database session for the update
                                db_gen = get_db()
                                new_db = next(db_gen)
                                try:
                                    new_session_service = SmartSearchSessionService(new_db)
                                    new_session_service.update_filtering_step(
                                        session_id=session.id,
                                        user_id=current_user.user_id,
                                        total_filtered=filtering_stats["total_filtered"],
                                        accepted=filtering_stats["accepted"],
                                        rejected=filtering_stats["rejected"],
                                        average_confidence=avg_confidence,
                                        duration_seconds=duration_seconds,
                                        submitted_discriminator=filtering_stats["actual_discriminator"],
                                        prompt_tokens=filtering_stats["prompt_tokens"],
                                        completion_tokens=filtering_stats["completion_tokens"],
                                        total_tokens=filtering_stats["total_tokens"]
                                    )
                                finally:
                                    new_db.close()
                        except Exception as parse_error:
                            logger.warning(f"Failed to parse filtering message: {parse_error}")
                    
                    yield message
                    
            except Exception as e:
                logger.error(f"Filtering error for user {current_user.user_id}: {e}", exc_info=True)
                # Send error message in SSE format
                import json
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
        logger.error(f"Failed to start filter-all for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start filter-all: {str(e)}")


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
        session_service = SmartSearchSessionService(db)
        return session_service.get_user_sessions(
            user_id=current_user.user_id,
            limit=limit,
            offset=offset
        )
        
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
        session_service = SmartSearchSessionService(db)
        session = session_service.get_session(session_id, current_user.user_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve session {session_id} for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve session: {str(e)}")


@router.post("/sessions/{session_id}/reset-to-step")
async def reset_session_to_step(
    session_id: str,
    request: SessionResetRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Reset session to a specific step, clearing all data forward of that step
    """
    try:
        logger.info(f"User {current_user.user_id} resetting session {session_id} to step {request.step}")
        
        session_service = SmartSearchSessionService(db)
        session = session_service.reset_to_step(session_id, current_user.user_id, request.step)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Session {session_id} reset to step {request.step} for user {current_user.user_id}")
        return {"message": f"Session reset to step {request.step}", "session": session.to_dict()}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset session {session_id} to step {request.step} for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reset session: {str(e)}")