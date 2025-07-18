from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from database import get_db
from services.asset_service import AssetService, get_asset_service
from services.asset_summary_service import AssetSummaryService
from services import auth_service
from schemas.asset import Asset, CreateAssetRequest, DatabaseEntityMetadata
from schemas.chat import AssetReference
from models import User, Asset as AssetModel
from services.db_entity_service import DatabaseEntityService

router = APIRouter(prefix="/assets", tags=["assets"])


# CREATE ASSET
@router.post("/", response_model=Asset)
async def create_asset(
    request: CreateAssetRequest,
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Create a new asset"""
    return asset_service.create_asset(
        user_id=current_user.user_id,
        name=request.name,
        schema_definition={'type': request.type, 'description': request.description or f'{request.name} asset'},
        subtype=request.subtype,
        description=request.description,
        content=request.content,
        asset_metadata=request.asset_metadata
    )

# RETRIEVE ASSETS
@router.get("/{asset_id}", response_model=Asset)
async def get_asset(
    asset_id: str,
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get an asset by ID"""
    asset = asset_service.get_asset(asset_id, current_user.user_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.get("/{asset_id}/details")
async def get_asset_details(
    asset_id: str, 
    asset_service: AssetService = Depends(get_asset_service)
) -> Dict[str, Any]:
    """
    Get detailed information about an asset, including its content.
    For database entity assets, this will fetch the content from the database.
    """
    # Use AssetService to get the asset with unified schema format
    asset = asset_service.get_asset_with_details(asset_id)
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Return the unified asset format
    return asset.model_dump(mode='json')

@router.get("/", response_model=List[Asset])
async def get_user_assets(
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get all assets for the current user"""
    return asset_service.get_user_assets(
        user_id=current_user.user_id
    )

# UPDATE ASSET
@router.put("/{asset_id}", response_model=Asset)
async def update_asset(
    asset_id: str,
    updates: dict,
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Update an asset"""
    asset = asset_service.update_asset(asset_id, current_user.user_id, updates)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

# ASSET SUMMARIES FOR CHAT CONTEXT
@router.get("/summaries", response_model=List[AssetReference])
async def get_asset_summaries(
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get lightweight asset summaries for chat context"""
    summary_service = AssetSummaryService()
    
    # Get all user assets
    assets = asset_service.get_user_assets(current_user.user_id)
    
    # Create summaries
    summaries = []
    for asset in assets:
        summaries.append(summary_service.create_asset_summary(asset))
    
    return summaries

# DELETE ASSET
@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    asset_service: AssetService = Depends(get_asset_service),
    current_user: User = Depends(auth_service.validate_token)
):
    """Delete an asset"""
    success = asset_service.delete_asset(asset_id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"} 