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
    ArticleGroupDetail
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
    ) -> Dict[str, Any]:
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
        
        return {
            "groups": [self._group_to_summary(group) for group in groups],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    def create_group(self, user_id: int, request) -> Dict[str, Any]:
        """Create a new article group."""
        group = ArticleGroupModel(
            user_id=user_id,
            name=request.name,
            description=request.description,
            search_query=request.search_query,
            search_provider=request.search_provider,
            search_params=request.search_params or {},
            feature_definitions=request.feature_definitions or [],
            article_count=0
        )
        
        self.db.add(group)
        self.db.flush()  # Get the ID
        
        # Add articles if provided
        if request.articles:
            self._add_articles_to_group(group, request.articles, request.feature_definitions or [])
        
        self.db.commit()
        self.db.refresh(group)
        
        # Ensure article count is accurate after refresh
        actual_count = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).count()
        if group.article_count != actual_count:
            print(f"Article count mismatch for group {group.id}: stored={group.article_count}, actual={actual_count}")
            group.article_count = actual_count
            self.db.commit()
            self.db.refresh(group)
        
        return self._group_to_summary(group)
    
    def get_group_detail(self, user_id: int, group_id: str, page: int = 1, page_size: int = 20) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific group with pagination."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        try:
            detail_data = self._group_to_detail_paginated(group, page, page_size)
            return detail_data
        except Exception as e:
            print(f"Error in get_group_detail: {e}")
            raise
    
    def update_group(self, user_id: int, group_id: str, request) -> Optional[Dict[str, Any]]:
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
        if request.feature_definitions is not None:
            group.feature_definitions = request.feature_definitions
        
        group.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(group)
        
        return self._group_to_summary(group)
    
    def delete_group(self, user_id: int, group_id: str) -> Optional[Dict[str, Any]]:
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
        
        return {
            "success": True,
            "message": f"Group '{group.name}' deleted successfully",
            "deleted_group_id": group_id,
            "deleted_articles_count": article_count
        }
    
    def add_articles_to_group(
        self, 
        user_id: int, 
        group_id: str, 
        request
    ) -> Optional[Dict[str, Any]]:
        """Add articles to an existing group."""
        group = self.db.query(ArticleGroupModel).filter(
            and_(
                ArticleGroupModel.id == group_id,
                ArticleGroupModel.user_id == user_id
            )
        ).first()
        
        if not group:
            return None
        
        # Get count before adding
        count_before = group.article_count
        
        self._add_articles_to_group(group, request.articles, group.feature_definitions)
        
        self.db.commit()
        self.db.refresh(group)
        
        # Calculate how many were actually added
        count_after = group.article_count
        articles_added = count_after - count_before
        duplicates_skipped = len(request.articles) - articles_added
        
        return {
            "success": True,
            "message": f"Added {articles_added} new articles to group" + 
                      (f" ({duplicates_skipped} duplicates skipped)" if duplicates_skipped > 0 else ""),
            "group_id": group_id,
            "articles_saved": articles_added,
            "duplicates_skipped": duplicates_skipped
        }
    
    def save_tabelizer_state(
        self, 
        user_id: int, 
        group_id: str, 
        request
    ) -> Optional[Dict[str, Any]]:
        """Save workbench state (articles + features) to existing group."""
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
        group.feature_definitions = request.feature_definitions or []
        group.updated_at = datetime.utcnow()
        
        # Clear existing articles and add new ones
        self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group_id
        ).delete()
        
        self._add_articles_to_group(group, request.articles, request.feature_definitions or [])
        
        self.db.commit()
        self.db.refresh(group)
        
        return {
            "success": True,
            "message": f"Saved tabelizer state to group",
            "group_id": group_id,
            "articles_saved": group.article_count
        }
    
    def create_and_save_group(
        self, 
        user_id: int, 
        request
    ) -> Dict[str, Any]:
        """Create a new group and save tabelizer state to it."""
        group = ArticleGroupModel(
            user_id=user_id,
            name=request.group_name,
            description=request.group_description,
            search_query=request.search_query,
            search_provider=request.search_provider,
            search_params=request.search_params or {},
            feature_definitions=request.feature_definitions or [],
            article_count=0
        )
        
        self.db.add(group)
        self.db.flush()  # Get the ID
        
        self._add_articles_to_group(group, request.articles, request.feature_definitions or [])
        
        self.db.commit()
        self.db.refresh(group)
        
        return {
            "success": True,
            "message": f"Created group '{group.name}' with {group.article_count} articles",
            "group_id": group.id,
            "articles_saved": group.article_count
        }
    
    def _add_articles_to_group(
        self, 
        group: ArticleGroupModel, 
        articles: List[CanonicalResearchArticle],
        feature_definitions: List[Dict[str, Any]]
    ):
        """Helper to add articles to a group with extracted feature data."""
        # Get existing article IDs in the group to check for duplicates
        existing_article_ids = set(
            detail.article_data.get('id', '') 
            for detail in self.db.query(ArticleGroupDetailModel)
                                 .filter(ArticleGroupDetailModel.article_group_id == group.id)
                                 .all()
        )
        
        # Create feature data lookup from legacy format if needed
        feature_data_by_article = {}
        for feature in feature_definitions:
            if "data" in feature and "name" in feature:
                # Legacy column format - convert to feature data
                for article_id, value in feature["data"].items():
                    if article_id not in feature_data_by_article:
                        feature_data_by_article[article_id] = {}
                    feature_data_by_article[article_id][feature["name"]] = value
        
        # Get current max position for appending
        max_position_result = self.db.query(func.max(ArticleGroupDetailModel.position)).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).scalar()
        current_position = (max_position_result or -1) + 1
        
        # Add articles to group, skipping duplicates
        articles_added = 0
        for article in articles:
            # Skip if article already exists in group
            if article.id in existing_article_ids:
                continue
                
            # Get extracted features for this article
            feature_data = {}
            if article.id in feature_data_by_article:
                # Store feature data using feature ID keys (new format)
                for feature_name, value in feature_data_by_article[article.id].items():
                    feature_data[feature_name] = value
            
            article_detail = ArticleGroupDetailModel(
                article_group_id=group.id,
                article_data=article.dict(),
                notes='',
                feature_data=feature_data,
                article_metadata={},
                position=current_position
            )
            
            self.db.add(article_detail)
            current_position += 1
            articles_added += 1
        
        # Update article count and timestamp
        new_count = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).count()
        group.article_count = new_count
        group.updated_at = datetime.utcnow()
        print(f"Updated group {group.id} article count to {new_count}")
    
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
            "feature_definitions": group.feature_definitions,
            "article_count": group.article_count,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "updated_at": group.updated_at.isoformat() if group.updated_at else None
        }
    
    def _group_to_detail_paginated(self, group: ArticleGroupModel, page: int = 1, page_size: int = 20) -> dict:
        """Convert ArticleGroupModel to detailed format with paginated articles."""
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get total count
        total_count = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).count()
        
        # Get paginated articles
        articles = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).order_by(ArticleGroupDetailModel.position).offset(offset).limit(page_size).all()
        
        # Create proper ArticleGroupDetail objects
        article_items = []
        for detail in articles:
            try:
                article_detail = ArticleGroupDetail(
                    id=detail.id,
                    article_id=detail.article_data.get('id', ''),
                    group_id=detail.article_group_id,
                    article=CanonicalResearchArticle(**detail.article_data),
                    feature_data=detail.feature_data,
                    position=detail.position,
                    added_at=detail.created_at.isoformat()
                )
                # Convert to dict to avoid serialization issues
                article_items.append(article_detail.dict())
            except Exception as e:
                print(f"Error creating ArticleGroupDetail: {e}")
                print(f"Detail data: {detail.__dict__}")
                raise
        
        # Reconstruct feature data for each feature definition
        # For paginated results, we only include data for articles on current page
        reconstructed_features = []
        for feature_def in group.feature_definitions:
            feature_values = {}
            for article_item in article_items:
                article_id = article_item['article']['id']
                feature_id = feature_def.get("id", feature_def["name"])
                if feature_id in article_item['feature_data']:
                    feature_values[article_id] = str(article_item['feature_data'][feature_id])
            
            reconstructed_features.append({
                "id": feature_def.get("id", feature_def["name"]),
                "name": feature_def["name"],
                "description": feature_def["description"],
                "type": feature_def["type"],
                "data": feature_values,
                "options": feature_def.get("options", {})
            })
        
        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size
        
        # Return data with pagination metadata
        return {
            "id": group.id,
            "user_id": group.user_id,
            "name": group.name,
            "description": group.description,
            "search_query": group.search_query,
            "search_provider": group.search_provider,
            "search_params": group.search_params,
            "feature_definitions": reconstructed_features,
            "article_count": group.article_count,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "updated_at": group.updated_at.isoformat() if group.updated_at else None,
            "articles": article_items,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_results": total_count,
                "page_size": page_size
            }
        }
    
    def _group_to_detail(self, group: ArticleGroupModel) -> dict:
        """Convert ArticleGroupModel to detailed format with articles."""
        # Get articles
        articles = self.db.query(ArticleGroupDetailModel).filter(
            ArticleGroupDetailModel.article_group_id == group.id
        ).order_by(ArticleGroupDetailModel.position).all()
        
        # Create proper ArticleGroupDetail objects
        article_items = []
        for detail in articles:
            try:
                article_detail = ArticleGroupDetail(
                    id=detail.id,
                    article_id=detail.article_data.get('id', ''),
                    group_id=detail.article_group_id,
                    article=CanonicalResearchArticle(**detail.article_data),
                    feature_data=detail.feature_data,
                    position=detail.position,
                    added_at=detail.created_at.isoformat()
                )
                # Convert to dict to avoid serialization issues
                article_items.append(article_detail.dict())
            except Exception as e:
                print(f"Error creating ArticleGroupDetail: {e}")
                print(f"Detail data: {detail.__dict__}")
                raise
        
        # Reconstruct feature data for each feature definition
        reconstructed_features = []
        for feature_def in group.feature_definitions:
            feature_values = {}
            for article_item in article_items:
                article_id = article_item.article.id
                feature_id = feature_def.get("id", feature_def["name"])
                if feature_id in article_item.feature_data:
                    feature_values[article_id] = str(article_item.feature_data[feature_id])
            
            reconstructed_features.append({
                "id": feature_def.get("id", feature_def["name"]),
                "name": feature_def["name"],
                "description": feature_def["description"],
                "type": feature_def["type"],
                "data": feature_values,
                "options": feature_def.get("options", {})
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
            "feature_definitions": reconstructed_features,
            "article_count": group.article_count,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "updated_at": group.updated_at.isoformat() if group.updated_at else None,
            "articles": article_items
        }


def get_article_group_service(db: Session = None) -> ArticleGroupService:
    """Dependency injection for ArticleGroupService."""
    return ArticleGroupService(db)