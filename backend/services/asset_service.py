from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models import Asset as AssetModel
from schemas.asset import FileType, Asset, DataType
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
        # If content is a string and dataType is not unstructured, wrap it
        if isinstance(content, str) and model.dataType != DataType.UNSTRUCTURED:
            content = {model.dataType.value: content}
        
        # Ensure metadata is a dictionary
        metadata = model.metadata if isinstance(model.metadata, dict) else {}
        
        return Asset(
            asset_id=str(model.asset_id),
            name=model.name,
            description=model.description,
            fileType=model.fileType,
            dataType=model.dataType,
            content=content,
            metadata=metadata
        )

    def create_asset(
        self,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        fileType: FileType = FileType.TXT,
        dataType: Optional[DataType] = None,
        content: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Asset:
        """Create a new asset"""
        # If content is provided and dataType is not unstructured, wrap it
        if content is not None and dataType and dataType != DataType.UNSTRUCTURED:
            content = {dataType.value: content}

        # Ensure metadata is a dictionary
        metadata_dict = metadata if isinstance(metadata, dict) else {}
        if not metadata_dict:
            metadata_dict = {
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
            fileType=fileType,
            dataType=dataType or DataType.UNSTRUCTURED,
            content=content,
            metadata=metadata_dict
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
        fileType: Optional[FileType] = None,
        dataType: Optional[DataType] = None
    ) -> List[Asset]:
        """Get all assets for a user, optionally filtered by fileType and dataType"""
        query = self.db.query(AssetModel).filter(AssetModel.user_id == user_id)
        
        if fileType:
            query = query.filter(AssetModel.fileType == fileType)
        if dataType:
            query = query.filter(AssetModel.dataType == dataType)
            
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
            # If dataType exists and not unstructured, wrap content in object with dataType as key
            if asset_model.dataType and asset_model.dataType != DataType.UNSTRUCTURED:
                updates['content'] = {asset_model.dataType: updates['content']}
            asset_model.content = updates['content']
        if 'name' in updates:
            asset_model.name = updates['name']
        if 'description' in updates:
            asset_model.description = updates['description']
        if 'fileType' in updates:
            asset_model.fileType = updates['fileType']
        if 'dataType' in updates:
            asset_model.dataType = updates['dataType']
            # If content exists and new dataType is not unstructured, rewrap content
            if asset_model.content and updates['dataType'] != DataType.UNSTRUCTURED:
                asset_model.content = {updates['dataType']: asset_model.content}

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

    async def upload_file_asset(
        self,
        user_id: int,
        file: UploadFile,
        name: Optional[str] = None,
        description: Optional[str] = None,
        dataType: Optional[DataType] = None
    ) -> Asset:
        """Upload a file as an asset"""
        content = await file.read()
        
        # Create file record
        db_file = File(
            file_id=str(uuid.uuid4()),
            user_id=user_id,
            name=file.filename,
            description=description,
            content=content,
            mime_type=file.content_type,
            size=len(content)
        )
        self.db.add(db_file)
        self.db.commit()
        self.db.refresh(db_file)

        # Create asset record
        asset_model = AssetModel(
            user_id=user_id,
            name=name or file.filename,
            description=description,
            fileType=FileType.FILE,
            dataType=dataType,
            content={
                "file_id": db_file.file_id,
                "mime_type": file.content_type,
                "size": len(content)
            }
        )
        self.db.add(asset_model)
        self.db.commit()
        self.db.refresh(asset_model)
        return self._model_to_schema(asset_model)

    def download_file_asset(self, asset_id: str, user_id: int) -> Optional[tuple[bytes, str, str]]:
        """Download a file asset"""
        asset_model = self.db.query(AssetModel).filter(
            AssetModel.asset_id == asset_id,
            AssetModel.user_id == user_id,
            AssetModel.fileType == FileType.FILE
        ).first()
        
        if not asset_model or not asset_model.content or "file_id" not in asset_model.content:
            return None

        file_id = asset_model.content["file_id"]
        file_model = self.db.query(File).filter(
            File.file_id == file_id,
            File.user_id == user_id
        ).first()
        
        if not file_model:
            return None

        return file_model.content, file_model.mime_type, file_model.name 