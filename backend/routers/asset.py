from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from services.asset_service import AssetService
from schemas.asset import FileType, Asset, CreateAssetRequest
from services import auth_service
from models import User

router = APIRouter(prefix="/api/assets", tags=["assets"])

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
        fileType=request.fileType,
        dataType=request.dataType,
        description=request.description,
        content=request.content
    )

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

@router.get("/", response_model=List[Asset])
async def get_user_assets(
    fileType: Optional[FileType] = None,
    dataType: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Get all assets for the current user"""
    asset_service = AssetService(db)
    return asset_service.get_user_assets(
        user_id=current_user.user_id,
        fileType=fileType,
        dataType=dataType
    )

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

@router.post("/upload", response_model=Asset)
async def upload_file_asset(
    file: UploadFile = FastAPIFile(...),
    name: Optional[str] = None,
    description: Optional[str] = None,
    subtype: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Upload a file as an asset"""
    asset_service = AssetService(db)
    return await asset_service.upload_file_asset(
        user_id=current_user.user_id,
        file=file,
        name=name,
        description=description,
        subtype=subtype
    )

@router.get("/{asset_id}/download")
async def download_file_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.validate_token)
):
    """Download a file asset"""
    asset_service = AssetService(db)
    result = asset_service.download_file_asset(asset_id, current_user.user_id)
    if not result:
        raise HTTPException(status_code=404, detail="File asset not found")
    
    content, mime_type, filename = result
    return Response(
        content=content,
        media_type=mime_type,
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
    ) 