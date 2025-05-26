from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from database import get_db
from services.asset_service import AssetService
from services import auth_service
from schemas.asset import Asset, CreateAssetRequest, DatabaseEntityMetadata
from models import User, Asset as AssetModel
from services.db_entity_service import DatabaseEntityService

router = APIRouter(prefix="/assets", tags=["assets"])


# CREATE ASSET
@router.post("/", response_model=Asset)
async def create_asset(
    request: CreateAssetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Create a new asset"""
    asset_service = AssetService(db)
    return asset_service.create_asset(
        user_id=current_user.user_id,
        name=request.name,
        type=request.type,
        subtype=request.subtype,
        is_collection=request.is_collection,
        collection_type=request.collection_type,
        content=request.content,
        asset_metadata=request.asset_metadata
    )

# RETRIEVE ASSETS
@router.get("/{asset_id}", response_model=Asset)
async def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get an asset by ID"""
    asset_service = AssetService(db)
    asset = asset_service.get_asset(asset_id, current_user.user_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.get("/{asset_id}/details")
async def get_asset_details(asset_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get detailed information about an asset, including its content.
    For database entity assets, this will fetch the content from the database.
    """
    # Get the asset from the database
    asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # If it's a database entity and content needs to be fetched
    if asset.type == "database_entity" and asset.db_entity_metadata:
        try:
            # Parse the metadata
            metadata = DatabaseEntityMetadata(**asset.db_entity_metadata)
            
            # If content is not stored directly, fetch it
            if not metadata.is_direct_content:
                db_service = DatabaseEntityService(db)
                content = db_service.fetch_entities(metadata)
                
                # Return the asset with fetched content
                return {
                    "id": asset.id,
                    "name": asset.name,
                    "description": asset.description,
                    "type": asset.type,
                    "subtype": asset.subtype,
                    "is_collection": asset.is_collection,
                    "collection_type": asset.collection_type,
                    "content": content,
                    "asset_metadata": asset.asset_metadata,
                    "db_entity_metadata": asset.db_entity_metadata
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching asset content: {str(e)}")
    
    # For non-database entities or those with direct content, return as is
    return {
        "id": asset.id,
        "name": asset.name,
        "description": asset.description,
        "type": asset.type,
        "subtype": asset.subtype,
        "is_collection": asset.is_collection,
        "collection_type": asset.collection_type,
        "content": asset.content,
        "asset_metadata": asset.asset_metadata,
        "db_entity_metadata": asset.db_entity_metadata
    }

@router.get("/", response_model=List[Asset])
async def get_user_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get all assets for the current user"""
    asset_service = AssetService(db)
    return asset_service.get_user_assets(
        user_id=current_user.user_id
    )

# UPDATE ASSET
@router.put("/{asset_id}", response_model=Asset)
async def update_asset(
    asset_id: str,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Update an asset"""
    asset_service = AssetService(db)
    asset = asset_service.update_asset(asset_id, current_user.user_id, updates)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

# DELETE ASSET
@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Delete an asset"""
    asset_service = AssetService(db)
    success = asset_service.delete_asset(asset_id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"} 