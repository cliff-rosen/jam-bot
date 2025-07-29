"""
Unified Workbench API Router

Single API that handles both:
- Article group management (table view, bulk analysis) 
- Individual article research (deep dive, notes, features)

Delegates to separate services but provides unified API experience.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import User
from database import get_db
from schemas.article_group import (
    CreateArticleGroupRequest, UpdateArticleGroupRequest, SaveToGroupRequest,
    AddArticlesRequest, ArticleGroupResponse, ArticleGroupDetailResponse,
    ArticleGroupListResponse, ArticleGroupSaveResponse, ArticleGroupDeleteResponse,
    TabelizerColumnData
)

from services.auth_service import validate_token
from services.extraction_service import ExtractionService, get_extraction_service
from services.article_group_service import ArticleGroupService
from services.article_workbench_service import ArticleWorkbenchService

router = APIRouter(prefix="/workbench", tags=["workbench"])


# ================== REQUEST/RESPONSE MODELS ==================

class ExtractColumnRequest(BaseModel):
    """Request to extract a custom column"""
    articles: List[Dict[str, str]]  # [{id, title, abstract}]
    column_name: str
    column_description: str
    column_type: str = "text"  # "boolean", "text", "score", "number"
    column_options: Optional[Dict[str, Any]] = None

class ExtractColumnResponse(BaseModel):
    """Response with extracted column data"""
    results: Dict[str, str]  # article_id -> extracted_value
    metadata: Optional[Dict[str, Any]] = None

class ExtractMultipleColumnsRequest(BaseModel):
    """Request to extract multiple columns"""
    articles: List[Dict[str, str]]
    columns_config: Dict[str, Dict[str, Any]]  # column_name -> {description, type, options}

class ExtractMultipleColumnsResponse(BaseModel):
    """Response with multiple extracted columns"""
    results: Dict[str, Dict[str, str]]  # article_id -> column_name -> value
    metadata: Optional[Dict[str, Any]] = None

class UpdateNotesRequest(BaseModel):
    """Request to update article notes"""
    notes: str

class UpdateMetadataRequest(BaseModel):
    """Request to update article metadata"""
    metadata: Dict[str, Any]

class ExtractFeatureRequest(BaseModel):
    """Request to extract a single feature using AI"""
    feature_name: str
    feature_type: str
    extraction_prompt: str

class BatchExtractFeaturesRequest(BaseModel):
    """Request to extract features for multiple articles"""
    article_ids: List[str]
    feature_name: str
    feature_type: str
    extraction_prompt: str

class BatchUpdateMetadataRequest(BaseModel):
    """Request to update metadata for multiple articles"""
    metadata_updates: Dict[str, Dict[str, Any]]  # article_id -> metadata


# ================== GROUP MANAGEMENT ENDPOINTS ==================

@router.get("/groups", response_model=ArticleGroupListResponse)
async def get_user_groups(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get paginated list of user's workbench groups."""
    group_service = ArticleGroupService(db)
    return group_service.get_user_groups(current_user.user_id, page, limit, search)


@router.post("/groups", response_model=ArticleGroupResponse)
async def create_group(
    request: CreateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new workbench group."""
    group_service = ArticleGroupService(db)
    return group_service.create_group(current_user.user_id, request)


@router.get("/groups/{group_id}", response_model=ArticleGroupDetailResponse)
async def get_group_detail(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific group."""
    group_service = ArticleGroupService(db)
    result = group_service.get_group_detail(current_user.user_id, group_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.put("/groups/{group_id}", response_model=ArticleGroupResponse)
async def update_group(
    group_id: str,
    request: UpdateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update group metadata."""
    group_service = ArticleGroupService(db)
    result = group_service.update_group(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.delete("/groups/{group_id}", response_model=ArticleGroupDeleteResponse)
async def delete_group(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a group and all its articles."""
    group_service = ArticleGroupService(db)
    result = group_service.delete_group(current_user.user_id, group_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.post("/groups/{group_id}/articles", response_model=ArticleGroupSaveResponse)
async def add_articles_to_group(
    group_id: str,
    request: AddArticlesRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Add articles to an existing group."""
    group_service = ArticleGroupService(db)
    result = group_service.add_articles_to_group(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


# ================== ANALYSIS ENDPOINTS ==================

@router.post("/analysis/extract-column", response_model=ExtractColumnResponse)
async def extract_column_standalone(
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Extract a single column from articles (standalone operation)."""
    try:
        # Convert to extraction service format
        extraction_data = request.articles
        column_config = {
            request.column_name: {
                "description": request.column_description,
                "type": request.column_type,
                "options": request.column_options or {}
            }
        }
        
        result = extraction_service.extract_multiple_columns(extraction_data, column_config)
        
        # Extract just the single column results
        column_results = {}
        for article_id, columns in result.get("results", {}).items():
            column_results[article_id] = columns.get(request.column_name, "")
        
        return ExtractColumnResponse(
            results=column_results,
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Column extraction failed: {str(e)}"
        )


@router.post("/groups/{group_id}/extract-column", response_model=ExtractColumnResponse)
async def extract_column_for_group(
    group_id: str,
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a column for all articles in a group."""
    # Verify group access
    group_service = ArticleGroupService(db)
    group_detail = group_service.get_group_detail(current_user.user_id, group_id)
    
    if not group_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    # Extract articles from group for processing
    articles = []
    for article_item in group_detail.group["articles"]:
        article = article_item["article"]
        articles.append({
            "id": article["id"],
            "title": article.get("title", ""),
            "abstract": article.get("abstract", "")
        })
    
    # Use the standalone extraction with group articles
    request.articles = articles
    return await extract_column_standalone(request, current_user, extraction_service)


@router.post("/analysis/extract-multiple-columns", response_model=ExtractMultipleColumnsResponse)
async def extract_multiple_columns_standalone(
    request: ExtractMultipleColumnsRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Extract multiple columns from articles (standalone operation)."""
    try:
        result = extraction_service.extract_multiple_columns(
            request.articles, 
            request.columns_config
        )
        
        return ExtractMultipleColumnsResponse(
            results=result.get("results", {}),
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multiple column extraction failed: {str(e)}"
        )


@router.get("/analysis/presets")
async def get_analysis_presets(
    current_user: User = Depends(validate_token)
):
    """Get predefined analysis presets."""
    # TODO: Implement preset functionality in extraction service
    return {
        "presets": [],
        "message": "Analysis presets not yet implemented"
    }


# ================== INDIVIDUAL ARTICLE RESEARCH ENDPOINTS ==================

@router.get("/groups/{group_id}/articles/{article_id}")
async def get_article_workbench_data(
    group_id: str,
    article_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get complete workbench data for an article in a group."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.get_workbench_data(current_user.user_id, group_id, article_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.put("/groups/{group_id}/articles/{article_id}/notes")
async def update_article_notes(
    group_id: str,
    article_id: str,
    request: UpdateNotesRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update research notes for an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.update_notes(current_user.user_id, group_id, article_id, request.notes)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.put("/groups/{group_id}/articles/{article_id}/metadata")
async def update_article_metadata(
    group_id: str,
    article_id: str,
    request: UpdateMetadataRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update workbench metadata for an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.update_metadata(current_user.user_id, group_id, article_id, request.metadata)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.post("/groups/{group_id}/articles/{article_id}/extract-feature")
async def extract_article_feature(
    group_id: str,
    article_id: str,
    request: ExtractFeatureRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a single feature from an article using AI."""
    workbench_service = ArticleWorkbenchService(db, extraction_service)
    
    result = workbench_service.extract_feature(
        current_user.user_id, 
        group_id, 
        article_id,
        request.feature_name,
        request.feature_type,
        request.extraction_prompt
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.delete("/groups/{group_id}/articles/{article_id}/features/{feature_name}")
async def delete_article_feature(
    group_id: str,
    article_id: str,
    feature_name: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a specific feature from an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.delete_feature(current_user.user_id, group_id, article_id, feature_name)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


# ================== BATCH OPERATIONS ==================

@router.post("/groups/{group_id}/batch/extract-features")
async def batch_extract_features(
    group_id: str,
    request: BatchExtractFeaturesRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a feature across multiple articles in a group."""
    workbench_service = ArticleWorkbenchService(db, extraction_service)
    
    result = workbench_service.batch_extract_features(
        current_user.user_id,
        group_id,
        request.article_ids,
        request.feature_name,
        request.feature_type,
        request.extraction_prompt
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.put("/groups/{group_id}/batch/metadata")
async def batch_update_metadata(
    group_id: str,
    request: BatchUpdateMetadataRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update metadata for multiple articles in a group."""
    workbench_service = ArticleWorkbenchService(db)
    
    result = workbench_service.batch_update_metadata(
        current_user.user_id,
        group_id,
        request.metadata_updates
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


# ================== CONVENIENCE/LEGACY ENDPOINTS ==================

@router.post("/groups/{group_id}/save", response_model=ArticleGroupSaveResponse)
async def save_workbench_state(
    group_id: str,
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Save workbench state (articles + columns) to existing group."""
    group_service = ArticleGroupService(db)
    result = group_service.save_tabelizer_state(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.post("/groups/create-and-save", response_model=ArticleGroupSaveResponse)
async def create_and_save_group(
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new group and save workbench state to it."""
    group_service = ArticleGroupService(db)
    return group_service.create_and_save_group(current_user.user_id, request)