"""
Article Group Service

Handles all database operations for article groups and their details.
No database logic should exist in routers - it all goes here.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime

from models import ArticleGroup, ArticleGroupDetail, User
from schemas.canonical_types import CanonicalResearchArticle
from schemas.article_group import (
    CreateArticleGroupRequest, UpdateArticleGroupRequest, SaveToGroupRequest,
    AddArticlesRequest, ArticleGroupResponse, ArticleGroupDetail, ArticleGroupDetailResponse,
    ArticleGroupListResponse, ArticleGroupSaveResponse, ArticleGroupDeleteResponse,
    ArticleGroupItem, TabelizerColumnData
)


class ArticleGroupService:
    """Service for managing article groups and their contents."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_groups(
        self, 
        user_id: int, 
        page: int = 1, 
        limit: int = 20,
        search: Optional[str] = None
    ) -> ArticleGroupListResponse:
        """Get paginated list of user's article groups."""
        query = self.db.query(ArticleGroup).filter(ArticleGroup.user_id == user_id)
        
        # Apply search filter if provided
        if search:
            query = query.filter(
                ArticleGroup.name.ilike(f"%{search}%") |
                ArticleGroup.description.ilike(f"%{search}%")
            )
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        groups = query.order_by(ArticleGroup.updated_at.desc()).offset(offset).limit(limit).all()
        
        return ArticleGroupListResponse(
            groups=[self._group_to_summary(group) for group in groups],
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit
        )
    
    def create_group(self, user_id: int, request: CreateArticleGroupRequest) -> ArticleGroupResponse:
        """Create a new article group."""
        group = ArticleGroup(
            user_id=user_id,
            name=request.name,
            description=request.description,
            search_query=request.search_query,
            search_provider=request.search_provider,
            search_params=request.search_params or {},
            columns=request.columns or [],
            article_count=0
        )
        
        self.db.add(group)
        self.db.flush()  # Get the ID
        
        # Add articles if provided
        if request.articles:
            self._add_articles_to_group(group, request.articles, request.columns or [])
        
        self.db.commit()
        self.db.refresh(group)
        
        return ArticleGroupResponse(**self._group_to_summary(group))
    
    def get_group_detail(self, user_id: int, group_id: str) -> Optional[ArticleGroupDetailResponse]:
        """Get detailed information about a specific group."""
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
            
        return ArticleGroupDetailResponse(
            group=ArticleGroupDetail(**self._group_to_detail(group))
        )
    
    def update_group(self, user_id: int, group_id: str, request: UpdateArticleGroupRequest) -> Optional[ArticleGroupResponse]:
        """Update group metadata."""
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        # Update fields if provided
        if request.name is not None:
            group.name = request.name
        if request.description is not None:
            group.description = request.description
        if request.columns is not None:
            group.columns = request.columns
        
        group.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(group)
        
        return ArticleGroupResponse(**self._group_to_summary(group))
    
    def delete_group(self, user_id: int, group_id: str) -> Optional[ArticleGroupDeleteResponse]:
        """Delete a group and all its articles."""
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        # Count articles before deletion
        article_count = group.article_count
        
        # Delete the group (cascade will delete articles)
        self.db.delete(group)
        self.db.commit()
        
        return ArticleGroupDeleteResponse(
            success=True,
            message=f"Group '{group.name}' deleted successfully",
            deleted_group_id=group_id,
            deleted_articles_count=article_count
        )
    
    def add_articles_to_group(
        self, 
        user_id: int, 
        group_id: str, 
        request: AddArticlesRequest
    ) -> Optional[ArticleGroupSaveResponse]:
        """Add articles to an existing group."""
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        self._add_articles_to_group(group, request.articles, group.columns)
        
        self.db.commit()
        self.db.refresh(group)
        
        return ArticleGroupSaveResponse(
            success=True,
            message=f"Added {len(request.articles)} articles to group",
            group_id=group_id,
            articles_saved=len(request.articles)
        )
    
    def save_tabelizer_state(
        self, 
        user_id: int, 
        group_id: str, 
        request: SaveToGroupRequest
    ) -> Optional[ArticleGroupSaveResponse]:
        """Save tabelizer state (articles + columns) to existing group."""
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        # Update group with new search context and columns
        group.search_query = request.search_query
        group.search_provider = request.search_provider
        group.search_params = request.search_params or {}
        group.columns = request.columns
        group.updated_at = datetime.utcnow()
        
        # Clear existing articles and add new ones
        self.db.query(ArticleGroupDetail).filter(
            ArticleGroupDetail.article_group_id == group_id
        ).delete()
        
        self._add_articles_to_group(group, request.articles, request.columns)
        
        self.db.commit()
        self.db.refresh(group)
        
        return ArticleGroupSaveResponse(
            success=True,
            message=f"Saved tabelizer state to group",
            group_id=group_id,
            articles_saved=group.article_count
        )
    
    def create_and_save_group(
        self, 
        user_id: int, 
        request: SaveToGroupRequest
    ) -> ArticleGroupSaveResponse:
        """Create a new group and save tabelizer state to it."""
        group = ArticleGroup(
            user_id=user_id,
            name=request.group_name,
            description=request.group_description,
            search_query=request.search_query,
            search_provider=request.search_provider,
            search_params=request.search_params or {},
            columns=request.columns,
            article_count=0
        )
        
        self.db.add(group)
        self.db.flush()  # Get the ID
        
        self._add_articles_to_group(group, request.articles, request.columns)
        
        self.db.commit()
        self.db.refresh(group)
        
        return ArticleGroupSaveResponse(
            success=True,
            message=f"Created group '{group.name}' with {group.article_count} articles",
            group_id=group.id,
            articles_saved=group.article_count
        )
    
    def _add_articles_to_group(
        self, 
        group: ArticleGroup, 
        articles: List[CanonicalResearchArticle],
        columns: List[TabelizerColumnData]
    ):
        """Helper to add articles to a group with extracted column data."""
        # Create column data lookup
        column_data_by_article = {}
        for column in columns:
            for article_id, value in column.data.items():
                if article_id not in column_data_by_article:
                    column_data_by_article[article_id] = {}
                column_data_by_article[article_id][column.name] = value
        
        # Add articles to group
        for position, article in enumerate(articles):
            # Get extracted features for this article from columns
            extracted_features = {}
            if article.id in column_data_by_article:
                for column_name, value in column_data_by_article[article.id].items():
                    extracted_features[column_name] = {
                        "value": value,
                        "type": "text",  # Default type
                        "extraction_method": "ai",
                        "extracted_at": datetime.utcnow().isoformat()
                    }
            
            article_detail = ArticleGroupDetail(
                article_group_id=group.id,
                article_data=article.dict(),
                notes='',
                extracted_features=extracted_features,
                article_metadata={},
                position=position
            )
            
            self.db.add(article_detail)
        
        # Update article count
        group.article_count = len(articles)
        group.updated_at = datetime.utcnow()
    
    def _group_to_summary(self, group: ArticleGroup) -> dict:
        """Convert ArticleGroup to summary format."""
        return {
            "id": group.id,
            "user_id": group.user_id,
            "name": group.name,
            "description": group.description,
            "search_query": group.search_query,
            "search_provider": group.search_provider,
            "search_params": group.search_params,
            "columns": group.columns,
            "article_count": group.article_count,
            "created_at": group.created_at,
            "updated_at": group.updated_at
        }
    
    def _group_to_detail(self, group: ArticleGroup) -> dict:
        """Convert ArticleGroup to detailed format with articles."""
        # Get articles
        articles = self.db.query(ArticleGroupDetail).filter(
            ArticleGroupDetail.article_group_id == group.id
        ).order_by(ArticleGroupDetail.position).all()
        
        # Create proper ArticleGroupItem objects
        article_items = []
        for detail in articles:
            article_items.append(ArticleGroupItem(
                article=CanonicalResearchArticle(**detail.article_data),
                position=detail.position,
                column_data=detail.extracted_features,
                workbench_summary={
                    "has_notes": bool(detail.notes),
                    "feature_count": len(detail.extracted_features),
                    "tags": detail.article_metadata.get("tags", []),
                    "rating": detail.article_metadata.get("rating")
                }
            ))
        
        # Return data that can be used to construct ArticleGroupDetail
        return {
            "id": group.id,
            "user_id": group.user_id,
            "name": group.name,
            "description": group.description,
            "search_query": group.search_query,
            "search_provider": group.search_provider,
            "search_params": group.search_params,
            "columns": group.columns,
            "article_count": group.article_count,
            "created_at": group.created_at,
            "updated_at": group.updated_at,
            "articles": article_items
        }


def get_article_group_service(db: Session = None) -> ArticleGroupService:
    """Dependency injection for ArticleGroupService."""
    return ArticleGroupService(db)