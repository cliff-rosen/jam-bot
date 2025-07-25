"""
Tabelizer API endpoints for custom column extraction
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any
from pydantic import BaseModel

from services.extraction_service import ExtractionService, get_extraction_service
from services.auth_service import validate_token
from models import User
from database import get_db

router = APIRouter(prefix="/api/tabelizer", tags=["tabelizer"])


class TabelizerArticle(BaseModel):
    """Simplified article for extraction"""
    id: str
    title: str
    abstract: str


class ExtractColumnRequest(BaseModel):
    """Request to extract a custom column"""
    articles: List[TabelizerArticle]
    column_name: str
    column_description: str
    column_type: str = "boolean"  # "boolean" or "text"


class ExtractColumnResponse(BaseModel):
    """Response with extracted column data"""
    results: Dict[str, str]


@router.post("/extract-column", response_model=ExtractColumnResponse)
async def extract_column(
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
) -> ExtractColumnResponse:
    """
    Extract custom column data for a set of articles
    """
    try:
        # Convert articles to dict format
        articles_dict = [article.dict() for article in request.articles]
        
        # Extract column data
        results = await extraction_service.extract_tabelizer_column(
            articles=articles_dict,
            column_name=request.column_name,
            column_description=request.column_description,
            column_type=request.column_type,
            user_id=str(current_user.user_id)
        )
        
        return ExtractColumnResponse(results=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column extraction failed: {str(e)}")