"""
Article Workbench API Endpoints

Simple, clean API for workbench functionality using the ArticleGroupDetail table.
All workbench data is stored directly in the article group detail record.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, Any, Optional
from datetime import datetime

from database import get_db
from services.auth_service import validate_token
from models import User, ArticleGroup, ArticleGroupDetail
from schemas.canonical_types import CanonicalResearchArticle

router = APIRouter(prefix="/workbench", tags=["workbench"])

@router.get("/groups/{group_id}/articles/{article_id}")
async def get_article_workbench_data(
    group_id: str,
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get complete workbench data for an article in a group."""
    
    # Verify group ownership and get article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return {
        "article_data": article_detail.article_data,
        "notes": article_detail.notes or "",
        "extracted_features": article_detail.extracted_features or {},
        "metadata": article_detail.article_metadata or {},
        "position": article_detail.position,
        "created_at": article_detail.created_at.isoformat(),
        "updated_at": article_detail.updated_at.isoformat() if article_detail.updated_at else None
    }

@router.put("/groups/{group_id}/articles/{article_id}/notes")
async def update_article_notes(
    group_id: str,
    article_id: str,
    notes_data: Dict[str, str],
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update notes for an article."""
    
    # Find the article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    # Update notes
    article_detail.notes = notes_data.get("notes", "")
    article_detail.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(article_detail)
    
    return {"notes": article_detail.notes, "updated_at": article_detail.updated_at.isoformat()}

@router.put("/groups/{group_id}/articles/{article_id}/features")
async def update_article_features(
    group_id: str,
    article_id: str,
    features_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update extracted features for an article."""
    
    # Find the article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    # Update features - merge with existing
    current_features = article_detail.extracted_features or {}
    current_features.update(features_data.get("features", {}))
    
    article_detail.extracted_features = current_features
    article_detail.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(article_detail)
    
    return {
        "extracted_features": article_detail.extracted_features,
        "updated_at": article_detail.updated_at.isoformat()
    }

@router.put("/groups/{group_id}/articles/{article_id}/metadata")
async def update_article_metadata(
    group_id: str,
    article_id: str,
    metadata_update: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update metadata for an article."""
    
    # Find the article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    # Update metadata - merge with existing
    current_metadata = article_detail.article_metadata or {}
    current_metadata.update(metadata_update.get("metadata", {}))
    
    article_detail.article_metadata = current_metadata
    article_detail.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(article_detail)
    
    return {
        "metadata": article_detail.article_metadata,
        "updated_at": article_detail.updated_at.isoformat()
    }

@router.post("/groups/{group_id}/articles/{article_id}/extract-feature")
async def extract_feature(
    group_id: str,
    article_id: str,
    extraction_request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Extract a feature from an article using AI."""
    
    # Find the article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    feature_name = extraction_request.get("feature_name")
    feature_type = extraction_request.get("feature_type", "text")
    extraction_prompt = extraction_request.get("extraction_prompt")
    
    if not feature_name or not extraction_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="feature_name and extraction_prompt are required"
        )
    
    # TODO: Implement AI extraction here
    # For now, return a placeholder value
    extracted_value = f"AI extracted value for {feature_name}"
    
    # Update features
    current_features = article_detail.extracted_features or {}
    current_features[feature_name] = {
        "value": extracted_value,
        "type": feature_type,
        "method": "ai",
        "prompt": extraction_prompt,
        "confidence": 0.85,
        "extracted_at": datetime.utcnow().isoformat()
    }
    
    article_detail.extracted_features = current_features
    article_detail.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(article_detail)
    
    return {
        "feature_name": feature_name,
        "feature_data": current_features[feature_name],
        "updated_at": article_detail.updated_at.isoformat()
    }

@router.delete("/groups/{group_id}/articles/{article_id}/features/{feature_name}")
async def delete_feature(
    group_id: str,
    article_id: str,
    feature_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Delete a feature from an article."""
    
    # Find the article
    article_detail = db.query(ArticleGroupDetail).join(
        ArticleGroup, ArticleGroupDetail.article_group_id == ArticleGroup.id
    ).filter(
        and_(
            ArticleGroup.user_id == current_user.user_id,
            ArticleGroup.id == group_id,
            ArticleGroupDetail.article_data.op("->>")(["id"]) == article_id
        )
    ).first()
    
    if not article_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    # Remove feature
    current_features = article_detail.extracted_features or {}
    if feature_name in current_features:
        del current_features[feature_name]
        article_detail.extracted_features = current_features
        article_detail.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(article_detail)
    
    return {"message": f"Feature '{feature_name}' deleted successfully"}