"""
Tabelizer API endpoints for custom column extraction
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from services.extraction_service import ExtractionService, get_extraction_service
from services.auth_service import validate_token
from models import User, ArticleGroup, ArticleGroupDetail
from database import get_db
from schemas.article_group import (
    CreateArticleGroupRequest, UpdateArticleGroupRequest, SaveToGroupRequest,
    AddArticlesRequest, ArticleGroupResponse, ArticleGroupDetailResponse,
    ArticleGroupListResponse, ArticleGroupSaveResponse, ArticleGroupDeleteResponse,
    TabelizerColumnData
)

router = APIRouter(prefix="/tabelizer", tags=["tabelizer"])


class TabelizerArticle(BaseModel):
    """Simplified article for extraction"""
    id: str
    title: str
    abstract: str


class ColumnOptions(BaseModel):
    """Options for column extraction"""
    min: Optional[int] = None
    max: Optional[int] = None
    step: Optional[float] = None


class ExtractColumnRequest(BaseModel):
    """Request to extract a custom column"""
    articles: List[TabelizerArticle]
    column_name: str
    column_description: str
    column_type: str = "boolean"  # "boolean", "text", "score"
    column_options: Optional[ColumnOptions] = None


class ExtractColumnResponse(BaseModel):
    """Response with extracted column data"""
    results: Dict[str, str]


class ExtractMultipleColumnsRequest(BaseModel):
    """Request to extract multiple columns at once"""
    articles: List[TabelizerArticle]
    columns_config: Dict[str, Dict[str, str]]  # column_name -> {description, type}


class ExtractMultipleColumnsResponse(BaseModel):
    """Response with multiple extracted columns"""
    results: Dict[str, Dict[str, str]]  # article_id -> column_name -> value


@router.post("/extract-column", response_model=ExtractColumnResponse)
async def extract_column(
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
) -> ExtractColumnResponse:
    """
    Extract custom column data for a set of articles
    """
    try:
        # Convert articles to dict format
        articles_dict = [article.dict() for article in request.articles]
        
        # Extract column data
        results = await extraction_service.extract_tabelizer_column(
            articles=articles_dict,
            column_name=request.column_name,
            column_description=request.column_description,
            column_type=request.column_type,
            column_options=request.column_options.dict() if request.column_options else None,
            user_id=str(current_user.user_id)
        )
        
        return ExtractColumnResponse(results=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column extraction failed: {str(e)}")


@router.post("/extract-multiple-columns", response_model=ExtractMultipleColumnsResponse)
async def extract_multiple_columns(
    request: ExtractMultipleColumnsRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
) -> ExtractMultipleColumnsResponse:
    """
    Extract multiple custom columns for a set of articles
    """
    try:
        # Convert articles to dict format
        articles_dict = [article.dict() for article in request.articles]
        
        # Extract multiple columns
        results = await extraction_service.extract_tabelizer_multiple_columns(
            articles=articles_dict,
            columns_config=request.columns_config,
            user_id=str(current_user.user_id)
        )
        
        return ExtractMultipleColumnsResponse(results=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multiple column extraction failed: {str(e)}")


@router.get("/presets")
async def get_tabelizer_presets(
    current_user: User = Depends(validate_token)
):
    """
    Get available tabelizer presets
    """
    return {
        "research_features": {
            "name": "Research Features",
            "description": "Extract standard research article features (PoI relevance, DoI relevance, study type, etc.)",
            "columns": {
                "poi_relevance": {
                    "description": "Does this article relate to melanocortin or natriuretic pathways?",
                    "type": "boolean"
                },
                "doi_relevance": {
                    "description": "Does this article relate to dry eye, ulcerative colitis, crohn's disease, retinopathy, or retinal disease?",
                    "type": "boolean"
                },
                "is_systematic": {
                    "description": "Is this a systematic study (RCT, clinical trial, cohort study, etc.)?",
                    "type": "boolean"
                },
                "study_type": {
                    "description": "What type of study is this? (human RCT, human non-RCT, non-human life science, non life science, not a study)",
                    "type": "text"
                },
                "study_outcome": {
                    "description": "What is the primary outcome focus? (effectiveness, safety, diagnostics, biomarker, other)",
                    "type": "text"
                }
            }
        }
    }


# Article Group Management Endpoints

@router.get("/groups", response_model=ArticleGroupListResponse)
async def list_article_groups(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupListResponse:
    """
    List user's article groups
    """
    # Query groups for the user
    query = db.query(ArticleGroup).filter(
        ArticleGroup.user_id == str(current_user.user_id)
    ).order_by(ArticleGroup.created_at.desc())
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    groups = query.offset(skip).limit(limit).all()
    
    # Convert to response models
    group_responses = []
    for group in groups:
        group_responses.append(ArticleGroupResponse(
            id=group.id,
            user_id=group.user_id,
            name=group.name,
            description=group.description,
            search_query=group.search_query,
            search_provider=group.search_provider,
            search_params=group.search_params,
            columns=group.columns or [],
            created_at=group.created_at,
            updated_at=group.updated_at,
            article_count=group.article_count
        ))
    
    return ArticleGroupListResponse(groups=group_responses, total=total)


@router.post("/groups", response_model=ArticleGroupResponse)
async def create_article_group(
    request: CreateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupResponse:
    """
    Create new article group
    """
    # Create new group
    group = ArticleGroup(
        user_id=str(current_user.user_id),
        name=request.name,
        description=request.description,
        search_query=request.search_query,
        search_provider=request.search_provider,
        search_params=request.search_params,
        columns=[],
        article_count=0
    )
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return ArticleGroupResponse(
        id=group.id,
        user_id=group.user_id,
        name=group.name,
        description=group.description,
        search_query=group.search_query,
        search_provider=group.search_provider,
        search_params=group.search_params,
        columns=group.columns,
        created_at=group.created_at,
        updated_at=group.updated_at,
        article_count=group.article_count
    )


@router.get("/groups/{group_id}", response_model=ArticleGroupDetailResponse)
async def get_article_group(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupDetailResponse:
    """
    Get specific article group with articles and columns
    """
    # Get group
    group = db.query(ArticleGroup).filter(
        ArticleGroup.id == group_id,
        ArticleGroup.user_id == str(current_user.user_id)
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Article group not found")
    
    # Get articles
    article_details = db.query(ArticleGroupDetail).filter(
        ArticleGroupDetail.article_group_id == group_id
    ).order_by(ArticleGroupDetail.position).all()
    
    # Extract articles from article_data
    articles = [detail.article_data for detail in article_details]
    
    # Reconstruct columns from article extracted_features
    columns = []
    if group.columns:
        for col_meta in group.columns:
            column_data = {}
            for article in articles:
                # Extract column value from article's extracted_features
                extracted_features = article.get("extracted_features", {})
                value = extracted_features.get(col_meta["name"], "-")
                column_data[article["id"]] = value
            
            columns.append(TabelizerColumnData(
                id=col_meta["id"],
                name=col_meta["name"],
                description=col_meta["description"],
                type=col_meta["type"],
                data=column_data,
                options=col_meta.get("options")
            ))
    
    return ArticleGroupDetailResponse(
        id=group.id,
        user_id=group.user_id,
        name=group.name,
        description=group.description,
        search_query=group.search_query,
        search_provider=group.search_provider,
        search_params=group.search_params,
        columns=columns,  # Use the reconstructed columns with data, not metadata
        created_at=group.created_at,
        updated_at=group.updated_at,
        article_count=group.article_count,
        articles=articles
    )


@router.put("/groups/{group_id}", response_model=ArticleGroupResponse)
async def update_article_group(
    group_id: str,
    request: UpdateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupResponse:
    """
    Update article group metadata
    """
    # Get group
    group = db.query(ArticleGroup).filter(
        ArticleGroup.id == group_id,
        ArticleGroup.user_id == str(current_user.user_id)
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Article group not found")
    
    # Update fields
    group.name = request.name
    group.description = request.description
    
    db.commit()
    db.refresh(group)
    
    return ArticleGroupResponse(
        id=group.id,
        user_id=group.user_id,
        name=group.name,
        description=group.description,
        search_query=group.search_query,
        search_provider=group.search_provider,
        search_params=group.search_params,
        columns=group.columns,
        created_at=group.created_at,
        updated_at=group.updated_at,
        article_count=group.article_count
    )


@router.delete("/groups/{group_id}", response_model=ArticleGroupDeleteResponse)
async def delete_article_group(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupDeleteResponse:
    """
    Delete article group
    """
    # Get group
    group = db.query(ArticleGroup).filter(
        ArticleGroup.id == group_id,
        ArticleGroup.user_id == str(current_user.user_id)
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Article group not found")
    
    # Delete group (cascade will delete articles)
    db.delete(group)
    db.commit()
    
    return ArticleGroupDeleteResponse(
        success=True,
        message=f"Article group '{group.name}' deleted successfully"
    )


@router.post("/groups/{group_id}/save", response_model=ArticleGroupSaveResponse)
async def save_to_group(
    group_id: str,
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupSaveResponse:
    """
    Save current tabelizer state to group
    """
    # Get group
    group = db.query(ArticleGroup).filter(
        ArticleGroup.id == group_id,
        ArticleGroup.user_id == str(current_user.user_id)
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Article group not found")
    
    # If overwrite, delete existing articles
    if request.overwrite:
        db.query(ArticleGroupDetail).filter(
            ArticleGroupDetail.article_group_id == group_id
        ).delete()
    
    # Extract column metadata (without data)
    column_metadata = []
    for col in request.columns:
        column_metadata.append({
            "id": col.id,
            "name": col.name,
            "description": col.description,
            "type": col.type,
            "options": col.options
        })
    
    # Update group metadata
    group.columns = column_metadata
    group.search_query = request.search_query or group.search_query
    group.search_provider = request.search_provider or group.search_provider
    group.search_params = request.search_params or group.search_params
    
    # Save articles with their extracted_features
    articles_saved = 0
    for position, article in enumerate(request.articles):
        article_detail = ArticleGroupDetail(
            article_group_id=group_id,
            article_data=article.dict(),
            position=position
        )
        db.add(article_detail)
        articles_saved += 1
    
    # Update article count
    group.article_count = db.query(func.count(ArticleGroupDetail.id)).filter(
        ArticleGroupDetail.article_group_id == group_id
    ).scalar()
    
    db.commit()
    
    return ArticleGroupSaveResponse(
        success=True,
        message=f"Saved {articles_saved} articles to group '{group.name}'",
        group_id=group_id,
        articles_saved=articles_saved
    )


@router.post("/groups/{group_id}/add", response_model=ArticleGroupSaveResponse)
async def add_to_group(
    group_id: str,
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupSaveResponse:
    """
    Add articles to existing group with duplicate removal and column merging
    """
    # Get group
    group = db.query(ArticleGroup).filter(
        ArticleGroup.id == group_id,
        ArticleGroup.user_id == str(current_user.user_id)
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Article group not found")
    
    # Get existing articles to check for duplicates
    existing_articles = db.query(ArticleGroupDetail).filter(
        ArticleGroupDetail.article_group_id == group_id
    ).all()
    
    # Create set of existing article IDs for duplicate detection
    existing_ids = {detail.article_data.get("id") for detail in existing_articles}
    
    # Filter out duplicates from new articles
    new_articles = [article for article in request.articles if article.id not in existing_ids]
    
    # Merge column metadata
    existing_columns = group.columns or []
    new_columns = []
    for col in request.columns:
        new_columns.append({
            "id": col.id,
            "name": col.name,
            "description": col.description,
            "type": col.type,
            "options": col.options
        })
    
    # Merge columns - keep existing ones and add new ones (avoid duplicate column names)
    existing_column_names = {col.get("name") for col in existing_columns}
    merged_columns = existing_columns.copy()
    
    for new_col in new_columns:
        if new_col.get("name") not in existing_column_names:
            merged_columns.append(new_col)
    
    # Update group metadata with merged columns
    group.columns = merged_columns
    
    # Add new articles
    articles_saved = 0
    current_position = len(existing_articles)  # Start after existing articles
    
    for article in new_articles:
        article_detail = ArticleGroupDetail(
            article_group_id=group_id,
            article_data=article.dict(),
            position=current_position + articles_saved
        )
        db.add(article_detail)
        articles_saved += 1
    
    # Update article count
    group.article_count = db.query(func.count(ArticleGroupDetail.id)).filter(
        ArticleGroupDetail.article_group_id == group_id
    ).scalar()
    
    db.commit()
    
    duplicates_removed = len(request.articles) - articles_saved
    message = f"Added {articles_saved} new articles to group '{group.name}'"
    if duplicates_removed > 0:
        message += f" ({duplicates_removed} duplicates removed)"
    
    return ArticleGroupSaveResponse(
        success=True,
        message=message,
        group_id=group_id,
        articles_saved=articles_saved
    )


@router.post("/groups/create-and-save", response_model=ArticleGroupSaveResponse)
async def create_and_save_group(
    request: SaveToGroupRequest,
    name: str,
    description: Optional[str] = None,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
) -> ArticleGroupSaveResponse:
    """
    Create a new group and save data to it in one operation
    """
    # Create new group
    group = ArticleGroup(
        user_id=str(current_user.user_id),
        name=name,
        description=description,
        search_query=request.search_query,
        search_provider=request.search_provider,
        search_params=request.search_params,
        columns=[],
        article_count=0
    )
    
    db.add(group)
    db.flush()  # Get the ID without committing
    
    # Extract column metadata
    column_metadata = []
    for col in request.columns:
        column_metadata.append({
            "id": col.id,
            "name": col.name,
            "description": col.description,
            "type": col.type,
            "options": col.options
        })
    
    group.columns = column_metadata
    
    # Save articles
    articles_saved = 0
    for position, article in enumerate(request.articles):
        article_detail = ArticleGroupDetail(
            article_group_id=group.id,
            article_data=article.dict(),
            position=position
        )
        db.add(article_detail)
        articles_saved += 1
    
    group.article_count = articles_saved
    
    db.commit()
    
    return ArticleGroupSaveResponse(
        success=True,
        message=f"Created group '{name}' and saved {articles_saved} articles",
        group_id=group.id,
        articles_saved=articles_saved
    )