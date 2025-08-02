"""
Article Group Detail Service

Handles all database operations for individual article details within groups.
Manages notes, metadata, and feature extraction for specific article-group relationships.
No database logic should exist in routers - it all goes here.
"""

from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime

from models import ArticleGroup, ArticleGroupDetail, User
from services.extraction_service import ExtractionService


class ArticleGroupDetailService:
    """Service for managing individual article details within groups."""
    
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
    
    async def extract_features(
        self,
        articles: List[Dict[str, Any]],
        features: List[Dict[str, Any]],
        persist_to_group: Optional[Tuple[int, str]] = None  # (user_id, group_id) if we want to save
    ) -> Dict[str, Dict[str, str]]:
        """
        Extract features from articles using AI.
        This is the single, unified extraction method.
        
        Args:
            articles: List of articles with id, title, abstract
            features: List of feature definitions with name, description, type, options
            persist_to_group: Optional (user_id, group_id) to persist results to database
            
        Returns:
            Dictionary mapping article ID to feature_name to extracted value
        """
        if not features:
            return {}
        
        if not self.extraction_service:
            raise ValueError("ExtractionService not available for feature extraction")
        
        # Build the multi-column schema
        properties = {}
        feature_map = {}  # name -> config for easy lookup
        
        for feature in features:
            feat_name = feature['name']
            feature_map[feat_name] = feature
            properties[feat_name] = self._build_feature_schema(feature)
        
        result_schema = {
            "type": "object",
            "properties": properties,
            "required": list(feature_map.keys())
        }
        
        # Build extraction instructions
        instruction_parts = []
        for feature in features:
            feat_name = feature['name']
            feat_type = feature.get('type', 'text')
            description = feature['description']
            
            # Add format hints based on type
            if feat_type == 'boolean':
                format_hint = "(Answer: 'yes' or 'no')"
            elif feat_type in ['score', 'number']:
                options = feature.get('options', {})
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                format_hint = f"(Numeric score {min_val}-{max_val})"
            else:
                format_hint = "(Brief text, max 100 chars)"
            
            instruction_parts.append(f"- {feat_name}: {description} {format_hint}")
        
        extraction_instructions = "\n".join(instruction_parts)
        
        # Extract for all articles
        results = {}
        for article in articles:
            article_id = article['id']
            
            try:
                # Clean source item structure
                source_item = {
                    "id": article['id'],
                    "title": article.get('title', ''),
                    "abstract": article.get('abstract', '')
                }
                
                # Create a unique schema key based on the feature names
                feature_names = sorted([feat['name'] for feat in features])
                schema_key = f"features_{hash(tuple(feature_names))}"
                
                extraction_result = await self.extraction_service.perform_extraction(
                    item=source_item,
                    result_schema=result_schema,
                    extraction_instructions=extraction_instructions,
                    schema_key=schema_key
                )
                
                # Process the results
                article_results = {}
                if extraction_result.extraction:
                    for feature in features:
                        feat_name = feature['name']
                        feat_type = feature.get('type', 'text')
                        feat_options = feature.get('options')
                        
                        if feat_name in extraction_result.extraction:
                            raw_value = extraction_result.extraction[feat_name]
                            article_results[feat_name] = self._clean_value(raw_value, feat_type, feat_options)
                        else:
                            article_results[feat_name] = self._get_default(feat_type, feat_options)
                else:
                    # Handle extraction failure - use defaults
                    for feature in features:
                        feat_name = feature['name']
                        feat_type = feature.get('type', 'text')
                        feat_options = feature.get('options')
                        article_results[feat_name] = self._get_default(feat_type, feat_options)
                
                results[article_id] = article_results
                
            except Exception as e:
                # On error, use default values
                article_results = {}
                for feature in features:
                    feat_name = feature['name']
                    feat_type = feature.get('type', 'text')
                    feat_options = feature.get('options')
                    article_results[feat_name] = self._get_default(feat_type, feat_options)
                results[article_id] = article_results
        
        # Optionally persist to database
        if persist_to_group:
            user_id, group_id = persist_to_group
            self._persist_extracted_features(user_id, group_id, results)
        
        return results
    
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
    
    async def extract_single_feature(
        self, 
        user_id: int, 
        group_id: str, 
        article_id: str,
        feature_name: str,
        feature_type: str,
        extraction_prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Extract a single feature from one article (convenience method)."""
        # Get the article
        article_detail = self._get_article_detail(user_id, group_id, article_id)
        if not article_detail:
            return None
        
        # Prepare article for extraction
        article_data = [{
            "id": article_detail.article_data["id"],
            "title": article_detail.article_data.get("title", ""),
            "abstract": article_detail.article_data.get("abstract", "")
        }]
        
        # Prepare feature definition
        feature_def = [{
            "name": feature_name,
            "description": extraction_prompt,
            "type": feature_type,
            "options": {}
        }]
        
        try:
            # Use the unified extraction method with persistence
            results = await self.extract_features(
                article_data, 
                feature_def, 
                persist_to_group=(user_id, group_id)
            )
            
            # Get the extracted value
            extracted_value = results.get(article_detail.article_data["id"], {}).get(feature_name, "")
            
            return {
                "feature_name": feature_name,
                "feature_data": extracted_value,
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "feature_name": feature_name,
                "feature_data": f"Extraction failed: {str(e)}",
                "error": str(e),
                "updated_at": datetime.utcnow().isoformat()
            }

    async def extract_feature_for_multiple_articles(
        self, 
        user_id: int, 
        group_id: str,
        article_ids: List[str],
        feature_name: str,
        feature_type: str,
        extraction_prompt: str
    ) -> Dict[str, Any]:
        """Extract one feature across multiple articles (convenience method)."""
        # Verify group ownership
        group = self.db.query(ArticleGroup).filter(
            and_(
                ArticleGroup.id == group_id,
                ArticleGroup.user_id == user_id
            )
        ).first()
        
        if not group:
            return {"error": "Group not found or access denied"}
        
        # Get articles to process
        articles_to_process = self.db.query(ArticleGroupDetail).filter(
            and_(
                ArticleGroupDetail.article_group_id == group_id,
                func.json_extract(ArticleGroupDetail.article_data, "$.id").in_(article_ids)
            )
        ).all()
        
        if not articles_to_process:
            return {"error": "No articles found to process"}
        
        # Prepare articles for extraction
        article_data = []
        for detail in articles_to_process:
            article = detail.article_data
            article_data.append({
                "id": article["id"],
                "title": article.get("title", ""),
                "abstract": article.get("abstract", "")
            })
        
        # Prepare feature definition
        feature_def = [{
            "name": feature_name,
            "description": extraction_prompt,
            "type": feature_type,
            "options": {}
        }]
        
        try:
            # Use the unified extraction method with persistence
            results = await self.extract_features(
                article_data, 
                feature_def, 
                persist_to_group=(user_id, group_id)
            )
            
            # Format results for batch response
            formatted_results = {}
            failures = {}
            
            for article_id in article_ids:
                if article_id in results and feature_name in results[article_id]:
                    formatted_results[article_id] = {
                        "value": results[article_id][feature_name],
                        "type": feature_type,
                        "extraction_method": "ai",
                        "extracted_at": datetime.utcnow().isoformat()
                    }
                else:
                    failures[article_id] = "Extraction failed or no result"
            
            return {
                "results": formatted_results,
                "failures": failures,
                "summary": {
                    "total_requested": len(article_ids),
                    "successful": len(formatted_results),
                    "failed": len(failures)
                }
            }
            
        except Exception as e:
            return {"error": f"Batch extraction failed: {str(e)}"}

    def _persist_extracted_features(
        self,
        user_id: int,
        group_id: str,
        extraction_results: Dict[str, Dict[str, str]]
    ):
        """Persist extracted features to database."""
        # Get article details to update
        article_ids = list(extraction_results.keys())
        articles_to_update = self.db.query(ArticleGroupDetail).join(
            ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
        ).filter(
            and_(
                ArticleGroup.user_id == user_id,
                ArticleGroup.id == group_id,
                func.json_extract(ArticleGroupDetail.article_data, "$.id").in_(article_ids)
            )
        ).all()
        
        for detail in articles_to_update:
            article_id = detail.article_data["id"]
            if article_id in extraction_results:
                # Update extracted features
                current_features = detail.extracted_features or {}
                for feature_name, value in extraction_results[article_id].items():
                    current_features[feature_name] = {
                        "value": value,
                        "extraction_method": "ai",
                        "extracted_at": datetime.utcnow().isoformat()
                    }
                detail.extracted_features = current_features
                detail.updated_at = datetime.utcnow()
        
        self.db.commit()
    
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

    def _build_feature_schema(self, feature_config: Dict[str, Any]) -> Dict[str, Any]:
        """Build schema property for a single feature."""
        feat_type = feature_config.get('type', 'text')
        description = feature_config['description']
        
        if feat_type == 'boolean':
            return {
                "type": "string",
                "enum": ["yes", "no"],
                "description": description
            }
        elif feat_type in ['score', 'number']:
            options = feature_config.get('options', {})
            min_val = options.get('min', 1)
            max_val = options.get('max', 10)
            return {
                "type": "number",
                "minimum": min_val,
                "maximum": max_val,
                "description": description
            }
        else:  # text
            return {
                "type": "string",
                "maxLength": 100,
                "description": description
            }

    def _clean_value(self, value: Any, feature_type: str, feature_options: Optional[Dict[str, Any]] = None) -> str:
        """Clean and validate extracted values based on feature type."""
        if feature_type == "boolean":
            clean_val = str(value).lower().strip()
            return clean_val if clean_val in ["yes", "no"] else "no"
        elif feature_type in ["score", "number"]:
            try:
                num_val = float(value)
                options = feature_options or {}
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                clamped_val = max(min_val, min(max_val, num_val))
                return str(int(clamped_val) if clamped_val.is_integer() else clamped_val)
            except (ValueError, TypeError):
                options = feature_options or {}
                return str(options.get('min', 1))
        else:  # text
            return str(value)[:100] if value is not None else ""

    def _get_default(self, feature_type: str, feature_options: Optional[Dict[str, Any]] = None) -> str:
        """Get default value for a feature type."""
        if feature_type == "boolean":
            return "no"
        elif feature_type in ["score", "number"]:
            options = feature_options or {}
            return str(options.get('min', 1))
        else:  # text
            return ""


def get_article_group_detail_service(
    db: Session = None, 
    extraction_service: ExtractionService = None
) -> ArticleGroupDetailService:
    """Dependency injection for ArticleGroupDetailService."""
    return ArticleGroupDetailService(db, extraction_service)