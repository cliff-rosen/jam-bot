"""
Article Workbench Service

Handles all database operations for individual article research (workbench functionality).
No database logic should exist in routers - it all goes here.
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime

from models import ArticleGroup, ArticleGroupDetail, User
from services.extraction_service import ExtractionService


class ArticleWorkbenchService:
    """Service for managing individual article research and workbench data."""
    
    def __init__(self, db: Session, extraction_service: ExtractionService = None):
        self.db = db
        self.extraction_service = extraction_service
    
    def get_workbench_data(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get complete workbench data for an article in a group."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        # Get group info for context
        group = self.db.query(ArticleGroup).filter(ArticleGroup.id == group_id).first()
        
        return {
            "article": article_detail.article_data,
            "workbench": {
                "notes": article_detail.notes or "",
                "features": article_detail.extracted_features or {},
                "metadata": article_detail.article_metadata or {},
                "position": article_detail.position,
                "created_at": article_detail.created_at.isoformat(),
                "updated_at": article_detail.updated_at.isoformat() if article_detail.updated_at else None
            },
            "group_context": {
                "group_id": group_id,
                "group_name": group.name if group else "Unknown",
                "total_articles": group.article_count if group else 0
            }
        }
    
    def update_notes(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str, 
        notes: str
    ) -> Optional[Dict[str, Any]]:
        """Update research notes for an article."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        article_detail.notes = notes
        article_detail.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(article_detail)
        
        return {
            "notes": article_detail.notes,
            "updated_at": article_detail.updated_at.isoformat()
        }
    
    def update_metadata(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str, 
        metadata_update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update workbench metadata for an article."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        # Merge with existing metadata
        current_metadata = article_detail.article_metadata or {}
        current_metadata.update(metadata_update)
        
        article_detail.article_metadata = current_metadata
        article_detail.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(article_detail)
        
        return {
            "metadata": article_detail.article_metadata,
            "updated_at": article_detail.updated_at.isoformat()
        }
    
    def update_features(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str, 
        features_update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update or add multiple features."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        # Merge with existing features
        current_features = article_detail.extracted_features or {}
        current_features.update(features_update)
        
        article_detail.extracted_features = current_features
        article_detail.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(article_detail)
        
        return {
            "features": article_detail.extracted_features,
            "updated_at": article_detail.updated_at.isoformat()
        }
    
    async def extract_feature(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str,
        feature_name: str,
        feature_type: str,
        extraction_prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Extract a single feature using AI."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        if not self.extraction_service:
            raise ValueError("ExtractionService not available for feature extraction")
        
        # Prepare article data for extraction
        article = article_detail.article_data
        extraction_data = [{
            "id": article["id"],
            "title": article.get("title", ""),
            "abstract": article.get("abstract", "")
        }]
        
        # Use extraction service to extract the feature
        try:
            # Create column definition for unified extraction
            columns = [{
                "name": feature_name,
                "description": extraction_prompt,
                "type": feature_type,
                "options": {}
            }]
            
            # Extract using the unified service
            extraction_result = await self.extraction_service.extract_unified_columns(
                extraction_data, 
                columns
            )
            
            # Get the extracted value
            extracted_value = extraction_result.get(article["id"], {}).get(feature_name, "")
            
            # Create feature object
            feature_data = {
                "value": extracted_value,
                "type": feature_type,
                "extraction_method": "ai",
                "extraction_prompt": extraction_prompt,
                "confidence_score": 0.85,  # Default confidence
                "extracted_at": datetime.utcnow().isoformat()
            }
            
            # Update features
            current_features = article_detail.extracted_features or {}
            current_features[feature_name] = feature_data
            
            article_detail.extracted_features = current_features
            article_detail.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(article_detail)
            
            return {
                "feature_name": feature_name,
                "feature": feature_data,
                "updated_at": article_detail.updated_at.isoformat()
            }
            
        except Exception as e:
            # Handle extraction errors
            return {
                "feature_name": feature_name,
                "feature": {
                    "value": f"Extraction failed: {str(e)}",
                    "type": feature_type,
                    "extraction_method": "ai",
                    "extraction_prompt": extraction_prompt,
                    "error": str(e),
                    "extracted_at": datetime.utcnow().isoformat()
                },
                "updated_at": datetime.utcnow().isoformat()
            }
    
    def delete_feature(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str,
        feature_name: str
    ) -> Optional[Dict[str, Any]]:
        """Delete a specific feature from an article."""
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        
        if not article_detail:
            return None
        
        # Remove feature if it exists
        current_features = article_detail.extracted_features or {}
        if feature_name in current_features:
            del current_features[feature_name]
            article_detail.extracted_features = current_features
            article_detail.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(article_detail)
        
        return {
            "message": f"Feature '{feature_name}' deleted successfully",
            "deleted_feature": feature_name
        }
    
    async def batch_extract_features(
        self, 
        user_id: int, 
        group_id: str,
        article_ids: List[str],
        feature_name: str,
        feature_type: str,
        extraction_prompt: str
    ) -> Dict[str, Any]:
        """Extract a feature across multiple articles in a group."""
        # Verify group ownership
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return {"error": "Group not found or access denied"}
        
        if not self.extraction_service:
            return {"error": "ExtractionService not available"}
        
        # Get articles to process
        articles_to_process = self.db.query(ArticleGroupDetail).filter(
            and_(
                ArticleGroupDetail.article_group_id == group_id,
                func.json_extract(ArticleGroupDetail.article_data, "$.id").in_(article_ids)
            )
        ).all()
        
        if not articles_to_process:
            return {"error": "No articles found to process"}
        
        # Prepare extraction data
        extraction_data = []
        article_details_map = {}
        
        for detail in articles_to_process:
            article = detail.article_data
            extraction_data.append({
                "id": article["id"],
                "title": article.get("title", ""),
                "abstract": article.get("abstract", "")
            })
            article_details_map[article["id"]] = detail
        
        # Perform batch extraction
        try:
            columns = [{
                "name": feature_name,
                "description": extraction_prompt,
                "type": feature_type,
                "options": {}
            }]
            
            extraction_result = await self.extraction_service.extract_unified_columns(
                extraction_data, 
                columns
            )
            
            # Update each article with extracted feature
            results = {}
            failures = {}
            
            for article_id, detail in article_details_map.items():
                try:
                    extracted_value = extraction_result.get(article_id, {}).get(feature_name, "")
                    
                    feature_data = {
                        "value": extracted_value,
                        "type": feature_type,
                        "extraction_method": "ai",
                        "extraction_prompt": extraction_prompt,
                        "confidence_score": 0.85,
                        "extracted_at": datetime.utcnow().isoformat()
                    }
                    
                    # Update features
                    current_features = detail.extracted_features or {}
                    current_features[feature_name] = feature_data
                    
                    detail.extracted_features = current_features
                    detail.updated_at = datetime.utcnow()
                    
                    results[article_id] = feature_data
                    
                except Exception as e:
                    failures[article_id] = str(e)
            
            # Commit all changes
            self.db.commit()
            
            return {
                "results": results,
                "failures": failures,
                "summary": {
                    "total_requested": len(article_ids),
                    "successful": len(results),
                    "failed": len(failures)
                }
            }
            
        except Exception as e:
            return {"error": f"Batch extraction failed: {str(e)}"}
    
    def batch_update_metadata(
        self, 
        user_id: int, 
        group_id: str,
        metadata_updates: Dict[str, Dict[str, Any]]  # article_id -> metadata
    ) -> Dict[str, Any]:
        """Update metadata for multiple articles in a group."""
        # Verify group ownership
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return {"error": "Group not found or access denied"}
        
        # Get articles to update
        articles_to_update = self.db.query(ArticleGroupDetail).filter(
            and_(
                ArticleGroupDetail.article_group_id == group_id,
                func.json_extract(ArticleGroupDetail.article_data, "$.id").in_(list(metadata_updates.keys()))
            )
        ).all()
        
        results = {}
        failures = {}
        
        for detail in articles_to_update:
            article_id = detail.article_data["id"]
            try:
                if article_id in metadata_updates:
                    # Merge with existing metadata
                    current_metadata = detail.article_metadata or {}
                    current_metadata.update(metadata_updates[article_id])
                    
                    detail.article_metadata = current_metadata
                    detail.updated_at = datetime.utcnow()
                    
                    results[article_id] = current_metadata
                    
            except Exception as e:
                failures[article_id] = str(e)
        
        # Commit all changes
        self.db.commit()
        
        return {
            "results": results,
            "failures": failures,
            "summary": {
                "total_requested": len(metadata_updates),
                "successful": len(results),
                "failed": len(failures)
            }
        }
    
    def _get_article_detail(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str
    ) -> Optional[ArticleGroupDetail]:
        """Helper to get article detail with proper authorization."""
        return self.db.query(ArticleGroupDetail).join(
            ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
        ).filter(
            and_(
                ArticleGroup.user_id == user_id,
                ArticleGroup.id == group_id,
                func.json_extract(ArticleGroupDetail.article_data, "$.id") == article_id
            )
        ).first()


def get_article_workbench_service(
    db: Session = None, 
    extraction_service: ExtractionService = None
) -> ArticleWorkbenchService:
    """Dependency injection for ArticleWorkbenchService."""
    return ArticleWorkbenchService(db, extraction_service)