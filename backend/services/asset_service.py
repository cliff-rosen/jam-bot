from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models import Asset as AssetModel
from schemas.asset import Asset, CollectionType, DatabaseEntityMetadata
from schemas.unified_schema import SchemaType, AssetMetadata
from datetime import datetime
import tiktoken
from services.db_entity_service import DatabaseEntityService

class AssetService:
    def __init__(self, db: Session):
        self.db = db
        self.tokenizer = tiktoken.get_encoding("cl100k_base")  # Using OpenAI's tokenizer
        self.db_entity_service = DatabaseEntityService(db)

    def get_asset_with_details(self, asset_id: str) -> Optional[Asset]:
        """Get an asset with all its details, including database entity content if applicable"""
        asset_model = self.db.query(AssetModel).filter(AssetModel.id == asset_id).first()
        if not asset_model:
            return None

        # Convert to schema
        asset = self._model_to_schema(asset_model)

        # If this is a database entity asset, fetch its content using DatabaseEntityService
        if asset.schema.type == "database_entity" and hasattr(asset_model, 'db_entity_metadata') and asset_model.db_entity_metadata:
            # Create DatabaseEntityMetadata from the model data
            db_metadata = DatabaseEntityMetadata(**asset_model.db_entity_metadata)
            content = self.db_entity_service.fetch_entities(db_metadata)
            asset.value = content

        return asset

    def _calculate_token_count(self, content: Any) -> int:
        """Calculate token count for an asset's content"""
        if content is None:
            return 0
            
        if isinstance(content, str):
            return len(self.tokenizer.encode(content))
        elif isinstance(content, (list, tuple)):
            return sum(self._calculate_token_count(item) for item in content)
        elif isinstance(content, dict):
            return sum(self._calculate_token_count(v) for v in content.values())
        else:
            # For other types, convert to string and count
            return len(self.tokenizer.encode(str(content)))

    def _model_to_schema(self, model: AssetModel) -> Asset:
        """Convert database model to unified Asset schema"""
        content = model.content
        # if content is a string then truncate it to 1000 characters
        if isinstance(content, str):
            content = content

        # Ensure metadata is a dictionary
        metadata_dict = model.asset_metadata if isinstance(model.asset_metadata, dict) else {}
        
        # Create unified schema type
        schema = SchemaType(
            type=model.type,
            description=model.description,
            is_array=model.is_collection or False,
            fields=None  # TODO: Could extract from content structure
        )
        
        # Create unified asset metadata
        def parse_datetime(date_value, default=None):
            """Parse datetime from various formats"""
            if default is None:
                default = datetime.utcnow()
            
            if isinstance(date_value, datetime):
                return date_value
            elif isinstance(date_value, str):
                try:
                    return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                except ValueError:
                    try:
                        return datetime.fromisoformat(date_value)
                    except ValueError:
                        return default
            else:
                return default
        
        asset_metadata = AssetMetadata(
            created_at=parse_datetime(metadata_dict.get('createdAt')),
            updated_at=parse_datetime(metadata_dict.get('updatedAt')),
            creator=metadata_dict.get('creator'),
            tags=metadata_dict.get('tags', []),
            agent_associations=metadata_dict.get('agent_associations', []),
            version=metadata_dict.get('version', 1),
            token_count=metadata_dict.get('token_count', 0)
        )
        
        return Asset(
            id=str(model.id),
            name=model.name,
            description=model.description or "",
            schema=schema,  # Use unified schema structure
            value=content,  # Use unified field name
            subtype=model.subtype,
            is_collection=model.is_collection or False,
            collection_type=model.collection_type or 'null',
            asset_metadata=asset_metadata  # Use unified metadata structure
        )

    def create_asset(
        self,
        user_id: str,
        name: str,
        type: str,
        subtype: Optional[str] = None,
        is_collection: bool = False,
        collection_type: Optional[CollectionType] = None,
        description: Optional[str] = None,
        content: Optional[Any] = None,
        asset_metadata: Optional[Dict[str, Any]] = None
    ) -> Asset:
        """Create a new asset"""

        # Calculate token count
        token_count = self._calculate_token_count(content)

        # Ensure metadata is a dictionary
        asset_metadata_dict = asset_metadata if isinstance(asset_metadata, dict) else {}
        if not asset_metadata_dict:
            asset_metadata_dict = {
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
                "creator": None,
                "tags": [],
                "agent_associations": [],
                "version": 1,
                "token_count": token_count
            }
        else:
            asset_metadata_dict["token_count"] = token_count

        asset_model = AssetModel(
            user_id=user_id,
            name=name,
            description=description,
            type=type,
            subtype=subtype,
            is_collection=is_collection,
            collection_type=collection_type,
            content=content,
            asset_metadata=asset_metadata_dict
        )
        self.db.add(asset_model)
        self.db.commit()
        self.db.refresh(asset_model)
        return self._model_to_schema(asset_model)

    def get_asset(self, asset_id: str, user_id: int) -> Optional[Asset]:
        """Get an asset by ID"""
        asset_model = self.db.query(AssetModel).filter(
            AssetModel.id == asset_id,
            AssetModel.user_id == user_id
        ).first()
        if not asset_model:
            return None
        return self._model_to_schema(asset_model)

    def get_user_assets(
        self,
        user_id: int,
    ) -> List[Asset]:
        """Get all assets for a user, optionally filtered by fileType and dataType"""
        query = self.db.query(AssetModel).filter(AssetModel.user_id == user_id)
        
        return [self._model_to_schema(model) for model in query.all()]

    def update_asset(
        self,
        asset_id: str,
        user_id: int,
        updates: Dict[str, Any]
    ) -> Optional[Asset]:
        """Update an asset"""
        asset_model = self.db.query(AssetModel).filter(
            AssetModel.id == asset_id,
            AssetModel.user_id == user_id
        ).first()
        if not asset_model:
            return None

        # If content is being updated, we need to recalculate token count
        if 'content' in updates:
            # Calculate new token count
            new_token_count = self._calculate_token_count(updates['content'])
            
            # Update metadata with new token count
            if 'asset_metadata' not in updates:
                updates['asset_metadata'] = asset_model.asset_metadata if isinstance(asset_model.asset_metadata, dict) else {}
            updates['asset_metadata']['token_count'] = new_token_count
            updates['asset_metadata']['updatedAt'] = datetime.utcnow().isoformat()

        # Handle special cases for updates
        if 'content' in updates:
            asset_model.content = updates['content']
        if 'name' in updates:
            asset_model.name = updates['name']
        if 'description' in updates:
            asset_model.description = updates['description']
        if 'type' in updates:
            asset_model.type = updates['type']
        if 'subtype' in updates:
            asset_model.subtype = updates['subtype']
        if 'is_collection' in updates:
            asset_model.is_collection = updates['is_collection']
        if 'collection_type' in updates:
            asset_model.collection_type = updates['collection_type']
        if 'asset_metadata' in updates:
            asset_model.asset_metadata = updates['asset_metadata']

        asset_model.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(asset_model)
        return self._model_to_schema(asset_model)

    def delete_asset(self, asset_id: str, user_id: int) -> bool:
        """Delete an asset"""
        asset_model = self.db.query(AssetModel).filter(
            AssetModel.id == asset_id,
            AssetModel.user_id == user_id
        ).first()
        if not asset_model:
            return False

        self.db.delete(asset_model)
        self.db.commit()
        return True
    