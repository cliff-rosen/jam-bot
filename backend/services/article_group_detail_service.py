"""
Article Group Detail Service

Handles all database operations for individual article details within groups.
Manages notes, metadata, and feature extraction for specific article-group relationships.
No database logic should exist in routers - it all goes here.
"""

from typing import Dict, Any, Optional, List
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

    async def extract_unified_columns(
        self,
        articles: List[Dict[str, Any]],
        columns: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Extract multiple columns from articles using a single LLM call per article.
        This method understands article structure and formats extraction instructions.
        
        Args:
            articles: List of articles with id, title, abstract
            columns: List of column definitions with name, description, type, options
            
        Returns:
            Dictionary mapping article ID to column_name to extracted value
        """
        if not columns:
            return {}
        
        if not self.extraction_service:
            raise ValueError("ExtractionService not available for feature extraction")
        
        # Build the multi-column schema
        properties = {}
        column_map = {}  # name -> config for easy lookup
        
        for column in columns:
            col_name = column['name']
            column_map[col_name] = column
            properties[col_name] = self._build_column_schema_property(column)
        
        result_schema = {
            "type": "object",
            "properties": properties,
            "required": list(column_map.keys())
        }
        
        # Build clean field instructions (domain-specific knowledge goes here)
        instruction_parts = []
        
        for column in columns:
            col_name = column['name']
            col_type = column.get('type', 'text')
            description = column['description']  # Already contains article-specific context
            
            # Add output format hints based on type
            if col_type == 'boolean':
                format_hint = "(Answer: 'yes' or 'no')"
            elif col_type in ['score', 'number']:
                options = column.get('options', {})
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                format_hint = f"(Numeric score {min_val}-{max_val})"
            else:
                format_hint = "(Brief text, max 100 chars)"
            
            instruction_parts.append(f"- {col_name}: {description} {format_hint}")
        
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
                
                # Use the single item extraction method
                # Create a unique schema key based on the column names to avoid cache collisions
                column_names = sorted([col['name'] for col in columns])
                schema_key = f"unified_columns_{hash(tuple(column_names))}"
                
                extraction_result = await self.extraction_service.perform_extraction(
                    item=source_item,
                    result_schema=result_schema,
                    extraction_instructions=extraction_instructions,
                    schema_key=schema_key
                )
                
                # Process the results
                article_results = {}
                if extraction_result.extraction:
                    for column in columns:
                        col_name = column['name']
                        col_type = column.get('type', 'text')
                        col_options = column.get('options')
                        
                        if col_name in extraction_result.extraction:
                            raw_value = extraction_result.extraction[col_name]
                            article_results[col_name] = self._clean_extracted_value(raw_value, col_type, col_options)
                        else:
                            article_results[col_name] = self._get_default_value(col_type, col_options)
                else:
                    # Handle extraction failure - use defaults for all columns
                    for column in columns:
                        col_name = column['name']
                        col_type = column.get('type', 'text')
                        col_options = column.get('options')
                        article_results[col_name] = self._get_default_value(col_type, col_options)
                
                results[article_id] = article_results
                
            except Exception as e:
                # On error, use default values for all columns
                article_results = {}
                for column in columns:
                    col_name = column['name']
                    col_type = column.get('type', 'text')
                    col_options = column.get('options')
                    article_results[col_name] = self._get_default_value(col_type, col_options)
                results[article_id] = article_results
                
        return results

    def _build_column_schema_property(self, column_config: Dict[str, Any]) -> Dict[str, Any]:
        """Build schema property for a single column"""
        col_type = column_config.get('type', 'text')
        description = column_config['description']
        
        if col_type == 'boolean':
            return {
                "type": "string",
                "enum": ["yes", "no"],
                "description": description
            }
        elif col_type in ['score', 'number']:
            options = column_config.get('options', {})
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

    def _clean_extracted_value(self, value: Any, column_type: str, column_options: Optional[Dict[str, Any]] = None) -> str:
        """Clean and validate extracted values based on column type"""
        if column_type == "boolean":
            clean_val = str(value).lower().strip()
            return clean_val if clean_val in ["yes", "no"] else "no"
        elif column_type in ["score", "number"]:
            try:
                num_val = float(value)
                options = column_options or {}
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                clamped_val = max(min_val, min(max_val, num_val))
                return str(int(clamped_val) if clamped_val.is_integer() else clamped_val)
            except (ValueError, TypeError):
                options = column_options or {}
                return str(options.get('min', 1))
        else:  # text
            return str(value)[:100] if value is not None else ""

    def _get_default_value(self, column_type: str, column_options: Optional[Dict[str, Any]] = None) -> str:
        """Get default value for a column type"""
        if column_type == "boolean":
            return "no"
        elif column_type in ["score", "number"]:
            options = column_options or {}
            return str(options.get('min', 1))
        else:  # text
            return ""


def get_article_group_detail_service(
    db: Session = None, 
    extraction_service: ExtractionService = None
) -> ArticleGroupDetailService:
    """Dependency injection for ArticleGroupDetailService."""
    return ArticleGroupDetailService(db, extraction_service)