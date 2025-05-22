from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models import Asset as AssetModel
from schemas.asset import Asset, AssetType, CollectionType
from datetime import datetime
from fastapi import UploadFile
import uuid
import json

class AssetService:
    def __init__(self, db: Session):
        self.db = db

    def _model_to_schema(self, model: AssetModel) -> Asset:
        """Convert database model to schema"""
        content = model.content
        
        # Ensure metadata is a dictionary
        metadata = model.asset_metadata if isinstance(model.asset_metadata, dict) else {}
        
        return Asset(
            id=str(model.id),
            name=model.name,
            description=model.description,
            type=model.type,
            subtype=model.subtype,
            is_collection=model.is_collection,
            collection_type=model.collection_type,
            content=content,
            asset_metadata=metadata
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

        # Ensure metadata is a dictionary
        asset_metadata_dict = asset_metadata if isinstance(asset_metadata, dict) else {}
        if not asset_metadata_dict:
            asset_metadata_dict = {
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
                "creator": None,
                "tags": [],
                "agent_associations": [],
                "version": 1
            }

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
            AssetModel.asset_id == asset_id,
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
            AssetModel.asset_id == asset_id,
            AssetModel.user_id == user_id
        ).first()
        if not asset_model:
            return None

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
            AssetModel.asset_id == asset_id,
            AssetModel.user_id == user_id
        ).first()
        if not asset_model:
            return False

        self.db.delete(asset_model)
        self.db.commit()
        return True
    