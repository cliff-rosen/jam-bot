"""
Workbench Service

Handles all database operations for workbench groups and their details.
No database logic should exist in routers - it all goes here.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime

from models import ArticleGroup as ArticleGroupModel, User
from models import ArticleGroupDetail as ArticleGroupDetailModel
from schemas.canonical_types import CanonicalResearchArticle
from schemas.workbench import (
    ArticleGroup, ArticleGroupDetail, ArticleGroupItem,
    WorkbenchColumnMetadata, TabelizerColumnData
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
    ) -> WorkbenchGroupListResponse:
        """Get paginated list of user's article groups."""
        query = self.db.query(ArticleGroupModel).filter(ArticleGroupModel.user_id == user_id)
        
        # Apply search filter if provided
        if search:
            query = query.filter(
                ArticleGroupModel.name.ilike(f"%{search}%") |
                ArticleGroupModel.description.ilike(f"%{search}%")
            )
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        groups = query.order_by(ArticleGroupModel.updated_at.desc()).offset(offset).limit(limit).all()
        
        return WorkbenchGroupListResponse(
            groups=[self._group_to_summary(group) for group in groups],
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit
        )
    
    def create_group(self, user_id: int, request: CreateWorkbenchGroupRequest) -> WorkbenchGroupResponse:
        """Create a new article group."""
        group = ArticleGroupModel(
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
        
        return WorkbenchGroupResponse(**self._group_to_summary(group))
    
    def get_group_detail(self, user_id: int, group_id: str) -> Optional[WorkbenchGroupDetailResponse]:
        """Get detailed information about a specific group."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        try:
            detail_data = self._group_to_detail(group)
            print(f"Detail data keys: {detail_data.keys()}")
            detail_obj = WorkbenchGroupDetail(**detail_data)
            return WorkbenchGroupDetailResponse(group=detail_obj)
        except Exception as e:
            print(f"Error in get_group_detail: {e}")
            print(f"Detail data: {detail_data}")
            raise
    
    def update_group(self, user_id: int, group_id: str, request: UpdateWorkbenchGroupRequest) -> Optional[WorkbenchGroupResponse]:
        """Update group metadata."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
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
        
        return WorkbenchGroupResponse(**self._group_to_summary(group))
    
    def delete_group(self, user_id: int, group_id: str) -> Optional[WorkbenchGroupDeleteResponse]:
        """Delete a group and all its articles."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        # Count articles before deletion
        article_count = group.article_count
        
        # Delete the group (cascade will delete articles)
        self.db.delete(group)
        self.db.commit()
        
        return WorkbenchGroupDeleteResponse(
            success=True,
            message=f"Group '{group.name}' deleted successfully",
            deleted_group_id=group_id,
            deleted_articles_count=article_count
        )
    
    def add_articles_to_group(
        self, 
        user_id: int, 
        group_id: str, 
        request: AddArticlesToWorkbenchGroupRequest
    ) -> Optional[WorkbenchGroupSaveResponse]:
        """Add articles to an existing group."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        self._add_articles_to_group(group, request.articles, group.columns)
        
        self.db.commit()
        self.db.refresh(group)
        
        return WorkbenchGroupSaveResponse(
            success=True,
            message=f"Added {len(request.articles)} articles to group",
            group_id=group_id,
            articles_saved=len(request.articles)
        )
    
    def save_tabelizer_state(
        self, 
        user_id: int, 
        group_id: str, 
        request: SaveToWorkbenchGroupRequest
    ) -> Optional[WorkbenchGroupSaveResponse]:
        """Save tabelizer state (articles + columns) to existing group."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
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
        self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group_id
        ).delete()
        
        self._add_articles_to_group(group, request.articles, request.columns)
        
        self.db.commit()
        self.db.refresh(group)
        
        return WorkbenchGroupSaveResponse(
            success=True,
            message=f"Saved tabelizer state to group",
            group_id=group_id,
            articles_saved=group.article_count
        )
    
    def create_and_save_group(
        self, 
        user_id: int, 
        request: SaveToWorkbenchGroupRequest
    ) -> WorkbenchGroupSaveResponse:
        """Create a new group and save tabelizer state to it."""
        group = ArticleGroupModel(
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
        
        return WorkbenchGroupSaveResponse(
            success=True,
            message=f"Created group '{group.name}' with {group.article_count} articles",
            group_id=group.id,
            articles_saved=group.article_count
        )
    
    def _add_articles_to_group(
        self, 
        group: ArticleGroupModel, 
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
            
            article_detail = ArticleGroupDetailModel(
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
    
    def _group_to_summary(self, group: ArticleGroupModel) -> dict:
        """Convert ArticleGroupModel to summary format."""
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
    
    def _group_to_detail(self, group: ArticleGroupModel) -> dict:
        """Convert ArticleGroupModel to detailed format with articles."""
        # Get articles
        articles = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).order_by(ArticleGroupDetailModel.position).all()
        
        # Create proper ArticleGroupItem objects
        article_items = []
        for detail in articles:
            try:
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
            except Exception as e:
                print(f"Error creating ArticleGroupItem: {e}")
                print(f"Detail data: {detail.__dict__}")
                raise
        
        # Reconstruct TabelizerColumnData from group columns and article data
        reconstructed_columns = []
        for column_meta in group.columns:
            column_data = {}
            for article_item in article_items:
                article_id = article_item.article.id
                if column_meta["name"] in article_item.column_data:
                    column_data[article_id] = str(article_item.column_data[column_meta["name"]].get("value", ""))
            
            reconstructed_columns.append({
                "id": column_meta.get("id", column_meta["name"]),
                "name": column_meta["name"],
                "description": column_meta["description"],
                "type": column_meta["type"],
                "data": column_data,
                "options": column_meta.get("options", {})
            })

        # Return data that can be used to construct ArticleGroupModelDetail
        return {
            "id": group.id,
            "user_id": group.user_id,
            "name": group.name,
            "description": group.description,
            "search_query": group.search_query,
            "search_provider": group.search_provider,
            "search_params": group.search_params,
            "columns": reconstructed_columns,
            "article_count": group.article_count,
            "created_at": group.created_at,
            "updated_at": group.updated_at,
            "articles": article_items
        }


def get_article_group_service(db: Session = None) -> ArticleGroupService:
    """Dependency injection for ArticleGroupService."""
    return ArticleGroupService(db)