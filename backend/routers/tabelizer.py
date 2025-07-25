"""
Tabelizer API endpoints for custom column extraction
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List, Any, Optional
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


class ColumnOptions(BaseModel):
    """Options for column extraction"""
    min: Optional[int] = None
    max: Optional[int] = None
    step: Optional[float] = None


class ExtractColumnRequest(BaseModel):
    """Request to extract a custom column"""
    articles: List[TabelizerArticle]
    column_name: str
    column_description: str
    column_type: str = "boolean"  # "boolean", "text", "score"
    column_options: Optional[ColumnOptions] = None


class ExtractColumnResponse(BaseModel):
    """Response with extracted column data"""
    results: Dict[str, str]


class ExtractMultipleColumnsRequest(BaseModel):
    """Request to extract multiple columns at once"""
    articles: List[TabelizerArticle]
    columns_config: Dict[str, Dict[str, str]]  # column_name -> {description, type}


class ExtractMultipleColumnsResponse(BaseModel):
    """Response with multiple extracted columns"""
    results: Dict[str, Dict[str, str]]  # article_id -> column_name -> value


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
            column_options=request.column_options.dict() if request.column_options else None,
            user_id=str(current_user.user_id)
        )
        
        return ExtractColumnResponse(results=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column extraction failed: {str(e)}")


@router.post("/extract-multiple-columns", response_model=ExtractMultipleColumnsResponse)
async def extract_multiple_columns(
    request: ExtractMultipleColumnsRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
) -> ExtractMultipleColumnsResponse:
    """
    Extract multiple custom columns for a set of articles
    """
    try:
        # Convert articles to dict format
        articles_dict = [article.dict() for article in request.articles]
        
        # Extract multiple columns
        results = await extraction_service.extract_tabelizer_multiple_columns(
            articles=articles_dict,
            columns_config=request.columns_config,
            user_id=str(current_user.user_id)
        )
        
        return ExtractMultipleColumnsResponse(results=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multiple column extraction failed: {str(e)}")


@router.get("/presets")
async def get_tabelizer_presets(
    current_user: User = Depends(validate_token)
):
    """
    Get available tabelizer presets
    """
    return {
        "research_features": {
            "name": "Research Features",
            "description": "Extract standard research article features (PoI relevance, DoI relevance, study type, etc.)",
            "columns": {
                "poi_relevance": {
                    "description": "Does this article relate to melanocortin or natriuretic pathways?",
                    "type": "boolean"
                },
                "doi_relevance": {
                    "description": "Does this article relate to dry eye, ulcerative colitis, crohn's disease, retinopathy, or retinal disease?",
                    "type": "boolean"
                },
                "is_systematic": {
                    "description": "Is this a systematic study (RCT, clinical trial, cohort study, etc.)?",
                    "type": "boolean"
                },
                "study_type": {
                    "description": "What type of study is this? (human RCT, human non-RCT, non-human life science, non life science, not a study)",
                    "type": "text"
                },
                "study_outcome": {
                    "description": "What is the primary outcome focus? (effectiveness, safety, diagnostics, biomarker, other)",
                    "type": "text"
                }
            }
        }
    }