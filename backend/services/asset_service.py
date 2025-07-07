from typing import List, Optional, Dict, Any
from schemas.asset import Asset, DatabaseEntityMetadata
from schemas.base import SchemaType
from schemas.asset import AssetMetadata
from datetime import datetime
import tiktoken
from services.db_entity_service import DatabaseEntityService
from database import get_db
from uuid import uuid4

# In-memory storage for assets
ASSET_DB: Dict[str, Asset] = {}

class AssetService:
    def __init__(self):
        db = get_db()
        self.db = db
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        self.db_entity_service = DatabaseEntityService(db)

    async def get_asset_with_details(self, asset_id: str) -> Optional[Asset]:
        """Get an asset with all its details, including database entity content if applicable"""
        asset_model = await self.db.fetch_one("SELECT * FROM assets WHERE id = :id", {"id": asset_id})
        if not asset_model:
            return None

        # Convert to schema
        asset = self._model_to_schema(asset_model)

        if asset.schema_definition.type == "database_entity" and hasattr(asset_model, 'db_entity_metadata') and asset_model.db_entity_metadata:
            db_metadata = DatabaseEntityMetadata(**asset_model.db_entity_metadata)
            content = await self.db_entity_service.fetch_entities(db_metadata)
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
            return len(self.tokenizer.encode(str(content)))

    def _model_to_schema(self, model: Dict[str, Any]) -> Asset:
        """Convert database model to unified Asset schema"""
        content = model.get('content')
        if isinstance(content, str):
            content = content

        metadata_dict = model.get('asset_metadata', {})
        
        # Determine if array from the type itself or schema logic
        # For now, default to False - this should be determined by type semantics
        is_array = False  # Will be determined by schema definition logic
        
        schema = SchemaType(
            type=model.get('type'),
            description=model.get('description'),
            is_array=is_array,
            fields=None
        )
        
        def parse_datetime(date_value, default=None):
            if default is None:
                default = datetime.utcnow()
            
            if isinstance(date_value, datetime):
                return date_value
            elif isinstance(date_value, str):
                try:
                    return datetime.fromisoformat(date_value.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    try:
                        return datetime.fromisoformat(date_value)
                    except (ValueError, TypeError):
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
            id=str(model.get('id')),
            name=model.get('name'),
            description=model.get('description', ""),
            schema_definition=schema,
            value=content,
            subtype=model.get('subtype'),
            role=model.get('role'),
            asset_metadata=asset_metadata
        )

    async def create_asset(
        self,
        user_id: str,
        name: str,
        type: str,
        subtype: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[Any] = None,
        asset_metadata: Optional[Dict[str, Any]] = None,
        scope_type: str = "mission",
        scope_id: str = "orphaned",
        asset_key: Optional[str] = None
    ) -> Asset:
        """Create a new asset with scope-based organization"""

        token_count = self._calculate_token_count(content)

        asset_metadata_dict = asset_metadata or {}
        asset_metadata_dict.setdefault("createdAt", datetime.utcnow().isoformat())
        asset_metadata_dict.setdefault("updatedAt", datetime.utcnow().isoformat())
        asset_metadata_dict.setdefault("version", 1)
        asset_metadata_dict["token_count"] = token_count

        # Use name as asset_key if not provided
        if asset_key is None:
            asset_key = name

        query = """
            INSERT INTO assets (id, user_id, name, description, type, subtype, content, asset_metadata, scope_type, scope_id, asset_key)
            VALUES (:id, :user_id, :name, :description, :type, :subtype, :content, :asset_metadata, :scope_type, :scope_id, :asset_key)
            RETURNING *
        """
        values = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "description": description,
            "type": type,
            "subtype": subtype,
            "content": content,
            "asset_metadata": asset_metadata_dict,
            "scope_type": scope_type,
            "scope_id": scope_id,
            "asset_key": asset_key
        }
        
        new_asset_model = await self.db.execute(query, values)
        return self._model_to_schema(new_asset_model)

    async def get_asset(self, asset_id: str, user_id: int) -> Optional[Asset]:
        """Get an asset by ID"""
        query = "SELECT * FROM assets WHERE id = :id AND user_id = :user_id"
        values = {"id": asset_id, "user_id": user_id}
        asset_model = await self.db.fetch_one(query, values)
        if not asset_model:
            return None
        return self._model_to_schema(asset_model)

    async def get_user_assets(
        self,
        user_id: int,
    ) -> List[Asset]:
        """Get all assets for a user"""
        query = "SELECT * FROM assets WHERE user_id = :user_id"
        values = {"user_id": user_id}
        asset_models = await self.db.fetch_all(query, values)
        return [self._model_to_schema(model) for model in asset_models]

    async def update_asset(
        self,
        asset_id: str,
        user_id: int,
        updates: Dict[str, Any]
    ) -> Optional[Asset]:
        """Update an asset"""
        
        if 'content' in updates:
            new_token_count = self._calculate_token_count(updates['content'])
            
            if 'asset_metadata' not in updates:
                current_asset = await self.get_asset(asset_id, user_id)
                updates['asset_metadata'] = current_asset.asset_metadata.dict() if current_asset else {}

            updates['asset_metadata']['token_count'] = new_token_count
            updates['asset_metadata']['updatedAt'] = datetime.utcnow().isoformat()

        updates['updated_at'] = datetime.utcnow()
        
        set_clause = ", ".join(f"{key} = :{key}" for key in updates.keys())
        query = f"UPDATE assets SET {set_clause} WHERE id = :id AND user_id = :user_id RETURNING *"
        
        values = updates.copy()
        values['id'] = asset_id
        values['user_id'] = user_id

        updated_asset_model = await self.db.execute(query, values)
        if not updated_asset_model:
            return None
        return self._model_to_schema(updated_asset_model)

    async def delete_asset(self, asset_id: str, user_id: int) -> bool:
        """Delete an asset"""
        query = "DELETE FROM assets WHERE id = :id AND user_id = :user_id"
        values = {"id": asset_id, "user_id": user_id}
        result = await self.db.execute(query, values)
        return result is not None
    