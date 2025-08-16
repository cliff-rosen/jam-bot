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
    FilterAllSearchResultsRequest,
    UnifiedFilterRequest,
    ParallelFilterResponse,
    QueryCountRequest,
    QueryCountResponse,
    OptimizedQueryRequest,
    OptimizedQueryResponse
)

from services.auth_service import validate_token
from services.smart_search_service import SmartSearchService
from services.smart_search_session_service import SmartSearchSessionService
from typing import List, AsyncGenerator
from schemas.smart_search import SearchArticle

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/lab/smart-search",
    tags=["smart-search"],
    dependencies=[Depends(validate_token)]
)


async def create_filtering_stream(
    articles: List[SearchArticle],
    refined_question: str,
    search_query: str,
    strictness: str,
    actual_discriminator: str,
    session_id: str,
    user_id: str,
    db: Session
) -> AsyncGenerator[str, None]:
    """
    Shared filtering stream generator for both filter endpoints
    """
    service = SmartSearchService()
    
    # Track filtering stats for session update
    filtering_stats = {
        "total_filtered": 0,
        "accepted": 0,
        "rejected": 0,
        "start_time": datetime.utcnow(),
        "actual_discriminator": actual_discriminator
    }
    
    try:
        # Stream the filtering process
        async for message in service.filter_articles_streaming(
            articles=articles,
            refined_question=refined_question,
            search_query=search_query,
            strictness=strictness,
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
                                session_id=session_id,
                                user_id=user_id,
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
        logger.error(f"Filtering error for user {user_id}: {e}", exc_info=True)
        # Send error message in SSE format
        import json
        error_message = {
            "type": "error",
            "message": f"Filtering failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }
        yield f"data: {json.dumps(error_message)}\n\n"


@router.post("/create-evidence-spec", response_model=SmartSearchRefinementResponse)
async def create_evidence_specification(
    request: SmartSearchRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> SmartSearchRefinementResponse:
    """
    Step 2: Create evidence specification from user's query
    """
    try:
        logger.info(f"User {current_user.user_id} creating evidence specification: {request.query[:100]}...")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get or create session
        session = session_service.get_or_create_session(
            user_id=current_user.user_id,
            original_question=request.query,
            session_id=request.session_id
        )
        
        # Create evidence specification
        service = SmartSearchService()
        evidence_spec, usage = await service.create_evidence_specification(request.query)
        
        # Update session with evidence specification results
        session_service.update_refinement_step(
            session_id=session.id,
            user_id=current_user.user_id,
            refined_question=evidence_spec,
            submitted_refined_question=None,  # Will be set when user actually submits in next step
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens
        )
        
        response = SmartSearchRefinementResponse(
            original_query=request.query,
            evidence_specification=evidence_spec,
            session_id=session.id
        )
        
        logger.info(f"Evidence specification completed for user {current_user.user_id}, session {session.id}")
        return response
        
    except Exception as e:
        logger.error(f"Query refinement failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Evidence specification failed: {str(e)}")


@router.post("/generate-keywords", response_model=SearchQueryResponse)
async def generate_keywords(
    request: SearchQueryRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> SearchQueryResponse:
    """
    Step 3: Generate search keywords from evidence specification
    """
    try:
        logger.info(f"User {current_user.user_id} generating keywords from: {request.evidence_specification[:100]}...")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate search keywords
        service = SmartSearchService()
        search_query, usage = await service.generate_search_keywords(request.evidence_specification)
        
        # Update session - this is when user actually submits their evidence specification
        session_service.update_search_query_step(
            session_id=session.id,
            user_id=current_user.user_id,
            generated_search_query=search_query,
            submitted_search_query=None,  # Will be set when user actually executes search
            submitted_refined_question=request.evidence_specification,  # What user actually submitted
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens
        )
        
        response = SearchQueryResponse(
            evidence_specification=request.evidence_specification,
            search_query=search_query,
            session_id=session.id
        )
        
        logger.info(f"Keyword generation completed for user {current_user.user_id}, session {session.id}")
        return response
        
    except Exception as e:
        logger.error(f"Search query generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search query generation failed: {str(e)}")


@router.post("/test-query-count", response_model=QueryCountResponse)
async def test_query_count(
    request: QueryCountRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> QueryCountResponse:
    """
    Test search query to get result count without retrieving articles
    """
    try:
        logger.info(f"User {current_user.user_id} testing query count: {request.search_query[:100]}...")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Verify session exists
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get search count
        service = SmartSearchService()
        total_count, sources_searched = await service.get_search_count(request.search_query)
        
        response = QueryCountResponse(
            search_query=request.search_query,
            total_count=total_count,
            sources_searched=sources_searched,
            session_id=session.id
        )
        
        logger.info(f"Query count test completed: {total_count} results")
        return response
        
    except Exception as e:
        logger.error(f"Query count test failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query count test failed: {str(e)}")


@router.post("/generate-optimized-query", response_model=OptimizedQueryResponse)
async def generate_optimized_query(
    request: OptimizedQueryRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
) -> OptimizedQueryResponse:
    """
    Generate optimized search query with volume control
    """
    try:
        logger.info(f"User {current_user.user_id} generating optimized query with target {request.target_max_results} results...")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Verify session exists
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate optimized query
        service = SmartSearchService()
        (initial_query, initial_count, final_query, 
         final_count, refinement_description, status) = await service.generate_optimized_search_query(
            request.evidence_specification, 
            request.target_max_results
        )
        
        # Update session with optimized search query
        session_service.update_search_query_step(
            session_id=session.id,
            user_id=current_user.user_id,
            generated_search_query=final_query,
            submitted_search_query=None,
            submitted_refined_question=request.evidence_specification,
            prompt_tokens=0,  # Optimization doesn't use LLM tokens
            completion_tokens=0,
            total_tokens=0
        )
        
        response = OptimizedQueryResponse(
            evidence_specification=request.evidence_specification,
            initial_query=initial_query,
            initial_count=initial_count,
            final_query=final_query,
            final_count=final_count,
            refinement_applied=refinement_description,
            refinement_status=status,
            session_id=session.id
        )
        
        logger.info(f"Optimized query generation completed: {final_count} results, status: {status}")
        return response
        
    except Exception as e:
        logger.error(f"Optimized query generation failed for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Optimized query generation failed: {str(e)}")


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
            refined_question=request.evidence_specification,
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
            evidence_specification=request.evidence_specification,
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


@router.post("/filter-unified-stream")
async def filter_unified_stream(
    request: UnifiedFilterRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Unified filtering endpoint that handles both selected and all filtering modes
    """
    try:
        logger.info(f"User {current_user.user_id} starting unified filtering in {request.filter_mode} mode")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Initialize smart search service
        service = SmartSearchService()
        
        # Determine articles to filter based on mode
        if request.filter_mode == "selected":
            if not request.articles:
                raise HTTPException(status_code=400, detail="Articles required for selected mode")
            articles_to_filter = request.articles
            logger.info(f"Filtering {len(articles_to_filter)} selected articles")
        elif request.filter_mode == "all":
            # Execute full search to get all available articles
            max_results = request.max_results or 500
            logger.info(f"Executing full search with max_results={max_results}")
            search_results = await service.search_articles(
                search_query=request.search_query,
                max_results=max_results,
                offset=0
            )
            articles_to_filter = search_results.articles
            logger.info(f"Retrieved {len(articles_to_filter)} articles for filtering")
            
            # Update session with search execution (full retrieval)
            session_service.update_search_execution_step(
                session_id=session.id,
                user_id=current_user.user_id,
                total_available=search_results.pagination.total_available,
                returned=len(articles_to_filter),
                sources=search_results.sources_searched,
                is_pagination_load=False,
                submitted_search_query=request.search_query
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid filter_mode. Must be 'selected' or 'all'")
        
        # Track article selection
        session_service.update_article_selection_step(
            session_id=session.id,
            user_id=current_user.user_id,
            selected_count=len(articles_to_filter)
        )
        
        # Discriminator is required
        if not request.discriminator_prompt:
            raise HTTPException(status_code=400, detail="Discriminator prompt is required")
        
        # Use shared filtering stream
        async def generate():
            async for message in create_filtering_stream(
                articles=articles_to_filter,
                refined_question=request.evidence_specification,
                search_query=request.search_query,
                strictness=request.strictness,
                actual_discriminator=request.discriminator_prompt,
                session_id=session.id,
                user_id=current_user.user_id,
                db=db
            ):
                yield message
        
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
        logger.error(f"Failed to start unified filtering for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start unified filtering: {str(e)}")


@router.post("/filter-parallel", response_model=ParallelFilterResponse)
async def filter_parallel(
    request: UnifiedFilterRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Parallel filtering endpoint that processes all articles concurrently (non-streaming)
    Faster for smaller article sets but returns all results at once
    """
    try:
        logger.info(f"User {current_user.user_id} starting parallel filtering in {request.filter_mode} mode")
        
        # Create session service
        session_service = SmartSearchSessionService(db)
        
        # Get session
        session = session_service.get_session(request.session_id, current_user.user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Initialize smart search service
        service = SmartSearchService()
        
        # Determine articles to filter based on mode
        if request.filter_mode == "selected":
            if not request.articles:
                raise HTTPException(status_code=400, detail="Articles required for selected mode")
            articles_to_filter = request.articles
            logger.info(f"Parallel filtering {len(articles_to_filter)} selected articles")
        elif request.filter_mode == "all":
            # Execute full search to get all available articles
            max_results = request.max_results or 500
            logger.info(f"Executing full search with max_results={max_results}")
            search_results = await service.search_articles(
                search_query=request.search_query,
                max_results=max_results,
                offset=0
            )
            articles_to_filter = search_results.articles
            logger.info(f"Retrieved {len(articles_to_filter)} articles for parallel filtering")
            
            # Update session with search execution (full retrieval)
            session_service.update_search_execution_step(
                session_id=session.id,
                user_id=current_user.user_id,
                total_available=search_results.pagination.total_available,
                returned=len(articles_to_filter),
                sources=search_results.sources_searched,
                is_pagination_load=False,
                submitted_search_query=request.search_query
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid filter_mode. Must be 'selected' or 'all'")
        
        # Track article selection
        session_service.update_article_selection_step(
            session_id=session.id,
            user_id=current_user.user_id,
            selected_count=len(articles_to_filter)
        )
        
        # Execute parallel filtering
        start_time = datetime.utcnow()
        filtered_articles, token_usage = await service.filter_articles_parallel(
            articles=articles_to_filter,
            refined_question=request.evidence_specification,
            search_query=request.search_query,
            strictness=request.strictness,
            custom_discriminator=request.discriminator_prompt
        )
        duration = datetime.utcnow() - start_time
        
        # Calculate statistics
        total_processed = len(filtered_articles)
        total_accepted = sum(1 for fa in filtered_articles if fa.passed)
        total_rejected = total_processed - total_accepted
        
        # Calculate average confidence (only for accepted articles)
        accepted_articles = [fa for fa in filtered_articles if fa.passed]
        average_confidence = (
            sum(fa.confidence for fa in accepted_articles) / len(accepted_articles)
            if accepted_articles else 0.0
        )
        
        # Update session with filtering results
        session_service.update_filtering_step(
            session_id=session.id,
            user_id=current_user.user_id,
            total_filtered=total_processed,
            accepted=total_accepted,
            rejected=total_rejected,
            average_confidence=average_confidence,
            duration_seconds=int(duration.total_seconds()),
            submitted_discriminator=request.discriminator_prompt,
            prompt_tokens=token_usage.prompt_tokens,
            completion_tokens=token_usage.completion_tokens,
            total_tokens=token_usage.total_tokens
        )
        
        logger.info(f"Parallel filtering completed for user {current_user.user_id}: {total_accepted}/{total_processed} articles accepted in {duration.total_seconds():.2f}s")
        
        return ParallelFilterResponse(
            filtered_articles=filtered_articles,
            total_processed=total_processed,
            total_accepted=total_accepted,
            total_rejected=total_rejected,
            average_confidence=average_confidence,
            duration_seconds=duration.total_seconds(),
            token_usage={
                "prompt_tokens": token_usage.prompt_tokens,
                "completion_tokens": token_usage.completion_tokens,
                "total_tokens": token_usage.total_tokens
            },
            session_id=session.id
        )
        
    except Exception as e:
        logger.error(f"Failed to start parallel filtering for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start parallel filtering: {str(e)}")


@router.post("/filter-stream")
async def filter_articles_stream(
    request: SemanticFilterRequest,
    current_user = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """
    Filter articles with semantic discriminator (streaming)
    DEPRECATED: Use /filter-unified-stream with filter_mode: 'selected' instead
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
        
        # Discriminator is required (deprecated endpoint - for backward compatibility)
        actual_discriminator = request.discriminator_prompt
        if not actual_discriminator:
            raise HTTPException(status_code=400, detail="Discriminator prompt is required")
        
        # Use shared filtering stream
        async def generate():
            async for message in create_filtering_stream(
                articles=request.articles,
                refined_question=request.evidence_specification,
                search_query=request.search_query,
                strictness=request.strictness,
                actual_discriminator=actual_discriminator,
                session_id=session.id,
                user_id=current_user.user_id,
                db=db
            ):
                yield message
        
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
    DEPRECATED: Use /filter-unified-stream with filter_mode: 'all' instead
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
        
        # Discriminator is required
        if not request.discriminator_prompt:
            raise HTTPException(status_code=400, detail="Discriminator prompt is required")
        
        # Use shared filtering stream
        async def generate():
            async for message in create_filtering_stream(
                articles=search_results.articles,
                refined_question=request.evidence_specification,
                search_query=request.search_query,
                strictness=request.strictness,
                actual_discriminator=actual_discriminator,
                session_id=session.id,
                user_id=current_user.user_id,
                db=db
            ):
                yield message
        
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