"""
Unified Workbench API Router

Single API that handles both:
- Article group management (table view, bulk analysis) 
- Individual article research (deep dive, notes, features)

Delegates to separate services but provides unified API experience.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from models import User
from database import get_db
from schemas.workbench import (
    ArticleGroup, ArticleGroupDetail, ArticleGroupItem, 
    WorkbenchColumnMetadata, TabelizerColumnData
)
from schemas.canonical_types import CanonicalResearchArticle

from services.auth_service import validate_token
from services.extraction_service import ExtractionService, get_extraction_service
from services.workbench_service import ArticleGroupService
from services.article_workbench_service import ArticleWorkbenchService

router = APIRouter(prefix="/workbench", tags=["workbench"])


# ================== REQUEST/RESPONSE MODELS ==================

# Article Group Management Requests
class CreateArticleGroupRequest(BaseModel):
    """Request to create a new article group"""
    name: str = Field(..., min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    articles: Optional[List[CanonicalResearchArticle]] = Field(None, description="Articles to add to the group")
    columns: Optional[List[WorkbenchColumnMetadata]] = Field(None, description="Column metadata")

class UpdateArticleGroupRequest(BaseModel):
    """Request to update article group metadata"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")

class SaveToGroupRequest(BaseModel):
    """Request to save current workbench state to a group"""
    group_name: str = Field(..., min_length=1, max_length=255, description="Group name")
    group_description: Optional[str] = Field(None, description="Group description")
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles with extracted_features")
    columns: List[WorkbenchColumnMetadata] = Field(..., description="Column metadata only")
    search_query: Optional[str] = Field(None, description="Search query used")
    search_provider: Optional[str] = Field(None, description="Search provider used")
    search_params: Optional[Dict[str, Any]] = Field(None, description="Search parameters")
    overwrite: bool = Field(False, description="Whether to replace existing data")

class AddArticlesRequest(BaseModel):
    """Request to add articles to an existing group"""
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles to add")

# Response Models
class ArticleGroupListResponse(BaseModel):
    """Response with list of article groups"""
    groups: List[ArticleGroup] = Field(..., description="List of groups")
    total: int = Field(..., description="Total number of groups")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")

class ArticleGroupDetailResponse(BaseModel):
    """Response wrapper for article group details"""
    group: ArticleGroupDetail = Field(..., description="Detailed group information")

class ArticleGroupSaveResponse(BaseModel):
    """Response after saving to a group"""
    success: bool = Field(..., description="Whether save was successful")
    message: str = Field(..., description="Success or error message")
    group_id: str = Field(..., description="ID of the saved group")
    articles_saved: int = Field(..., description="Number of articles saved")

class ArticleGroupDeleteResponse(BaseModel):
    """Response after deleting a group"""
    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Success or error message")
    deleted_group_id: str = Field(..., description="ID of the deleted group")
    deleted_articles_count: int = Field(..., description="Number of articles that were deleted")

# ================== WORKBENCH ANALYSIS MODELS ==================

class ExtractColumnRequest(BaseModel):
    """Request to extract a custom column"""
    articles: List[Dict[str, str]]  # [{id, title, abstract}]
    column_name: str
    column_description: str
    column_type: str = "text"  # "boolean", "text", "score", "number"
    column_options: Optional[Dict[str, Any]] = None

class ExtractColumnResponse(BaseModel):
    """Response with extracted column data"""
    results: Dict[str, str]  # article_id -> extracted_value
    metadata: Optional[Dict[str, Any]] = None

class ExtractMultipleColumnsRequest(BaseModel):
    """Request to extract multiple columns"""
    articles: List[Dict[str, str]]
    columns_config: Dict[str, Dict[str, Any]]  # column_name -> {description, type, options}

class ExtractMultipleColumnsResponse(BaseModel):
    """Response with multiple extracted columns"""
    results: Dict[str, Dict[str, str]]  # article_id -> column_name -> value
    metadata: Optional[Dict[str, Any]] = None

class UpdateNotesRequest(BaseModel):
    """Request to update article notes"""
    notes: str

class UpdateMetadataRequest(BaseModel):
    """Request to update article metadata"""
    metadata: Dict[str, Any]

class ExtractFeatureRequest(BaseModel):
    """Request to extract a single feature using AI"""
    feature_name: str
    feature_type: str
    extraction_prompt: str

class BatchExtractFeaturesRequest(BaseModel):
    """Request to extract features for multiple articles"""
    article_ids: List[str]
    feature_name: str
    feature_type: str
    extraction_prompt: str

class BatchUpdateMetadataRequest(BaseModel):
    """Request to update metadata for multiple articles"""
    metadata_updates: Dict[str, Dict[str, Any]]  # article_id -> metadata


# ================== GROUP MANAGEMENT ENDPOINTS ==================

@router.get("/groups", response_model=ArticleGroupListResponse)
async def get_user_groups(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get paginated list of user's workbench groups."""
    group_service = ArticleGroupService(db)
    return group_service.get_user_groups(current_user.user_id, page, limit, search)


@router.post("/groups", response_model=ArticleGroup)
async def create_group(
    request: CreateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new workbench group."""
    group_service = ArticleGroupService(db)
    return group_service.create_group(current_user.user_id, request)


@router.get("/groups/{group_id}", response_model=ArticleGroupDetailResponse)
async def get_group_detail(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific group."""
    group_service = ArticleGroupService(db)
    result = group_service.get_group_detail(current_user.user_id, group_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.put("/groups/{group_id}", response_model=ArticleGroup)
async def update_group(
    group_id: str,
    request: UpdateArticleGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update group metadata."""
    group_service = ArticleGroupService(db)
    result = group_service.update_group(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.delete("/groups/{group_id}", response_model=ArticleGroupDeleteResponse)
async def delete_group(
    group_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a group and all its articles."""
    group_service = ArticleGroupService(db)
    result = group_service.delete_group(current_user.user_id, group_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.post("/groups/{group_id}/articles", response_model=ArticleGroupSaveResponse)
async def add_articles_to_group(
    group_id: str,
    request: AddArticlesRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Add articles to an existing group."""
    group_service = ArticleGroupService(db)
    result = group_service.add_articles_to_group(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


# ================== ANALYSIS ENDPOINTS ==================

@router.post("/analysis/extract-column", response_model=ExtractColumnResponse)
async def extract_column_standalone(
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Extract a single column from articles (standalone operation)."""
    try:
        # Convert to extraction service format
        extraction_data = request.articles
        column_config = {
            request.column_name: {
                "description": request.column_description,
                "type": request.column_type,
                "options": request.column_options or {}
            }
        }
        
        result = await extraction_service.extract_multiple_columns(extraction_data, column_config)
        
        # Extract just the single column results
        column_results = {}
        for article_id, columns in result.get("results", {}).items():
            column_results[article_id] = columns.get(request.column_name, "")
        
        return ExtractColumnResponse(
            results=column_results,
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Column extraction failed: {str(e)}"
        )


@router.post("/groups/{group_id}/extract-column", response_model=ExtractColumnResponse)
async def extract_column_for_group(
    group_id: str,
    request: ExtractColumnRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a column for all articles in a group."""
    # Verify group access
    group_service = ArticleGroupService(db)
    group_detail = group_service.get_group_detail(current_user.user_id, group_id)
    
    if not group_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    # Extract articles from group for processing
    articles = []
    for article_item in group_detail.group["articles"]:
        article = article_item["article"]
        articles.append({
            "id": article["id"],
            "title": article.get("title", ""),
            "abstract": article.get("abstract", "")
        })
    
    # Use the standalone extraction with group articles
    request.articles = articles
    return await extract_column_standalone(request, current_user, extraction_service)


@router.post("/analysis/extract-multiple-columns", response_model=ExtractMultipleColumnsResponse)
async def extract_multiple_columns_standalone(
    request: ExtractMultipleColumnsRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Extract multiple columns from articles (standalone operation)."""
    try:
        result = await extraction_service.extract_multiple_columns(
            request.articles, 
            request.columns_config
        )
        
        return ExtractMultipleColumnsResponse(
            results=result.get("results", {}),
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multiple column extraction failed: {str(e)}"
        )


@router.get("/analysis/presets")
async def get_analysis_presets(
    current_user: User = Depends(validate_token)
):
    """Get predefined analysis presets."""
    presets = [
        {
            "id": "research_features",
            "name": "Research Features",
            "description": "Extract research features for DOI/POI analysis",
            "category": "Core Analysis",
            "columns": {
                "poi_relevance": {
                    "description": "Does this article relate to melanocortin or natriuretic pathways? Melanocortin keywords: melanocortin receptor, MC1R, MC2R, MC3R, MC4R, MC5R, ACTH, α-MSH, β-MSH, γ-MSH, melanocyte, pigmentation, appetite regulation. Natriuretic keywords: natriuretic peptide, ANP, BNP, CNP, NPR-A, NPR-B, NPR-C, guanylate cyclase, cardiac function",
                    "type": "boolean"
                },
                "doi_relevance": {
                    "description": "Does this article relate to dry eye, ulcerative colitis, crohn's disease, retinopathy, or retinal disease? Dry eye keywords: dry eye syndrome, keratoconjunctivitis sicca, tear film. IBD keywords: inflammatory bowel disease, IBD, ulcerative colitis, Crohn's disease, colitis. Retinal keywords: retinopathy, retinal disease, diabetic retinopathy, macular degeneration, retinal degeneration",
                    "type": "boolean"
                },
                "is_systematic": {
                    "description": "Is this a systematic study? Look for: randomized controlled clinical trials (RCTs), clinical trials, epidemiological studies, cohort studies, case-control studies, open label trials, case reports. Systematic reviews and meta-analyses should also be marked as 'yes'. Basic science, in vitro, and animal studies can also be systematic if they follow rigorous methodology",
                    "type": "boolean"
                },
                "study_type": {
                    "description": "Type of study: 'human RCT' (randomized controlled clinical trials with humans), 'human non-RCT' (human studies that are not RCTs - observational, cohort, case-control, case series), 'non-human life science' (animal studies, in vitro studies, cell culture, molecular biology), 'non life science' (non-biological research), 'not a study' (reviews non-systematic, editorials, opinions, commentaries, theoretical papers)",
                    "type": "text"
                },
                "study_outcome": {
                    "description": "Primary outcome focus: 'effectiveness' (testing if treatment/intervention works), 'safety' (testing safety, adverse events, toxicity, side effects), 'diagnostics' (developing or testing diagnostic methods), 'biomarker' (identifying or validating biomarkers non-diagnostic, prognostic markers), 'other' (basic science mechanisms, pathophysiology, epidemiology)",
                    "type": "text"
                }
            }
        },
        {
            "id": "clinical_trial",
            "name": "Clinical Trial Analysis",
            "description": "Extract key information from clinical trial papers",
            "category": "Medical Research",
            "columns": {
                "Study Type": {
                    "description": "What type of study is this? (e.g., RCT, observational, meta-analysis)",
                    "type": "text"
                },
                "Sample Size": {
                    "description": "What is the total sample size of the study?",
                    "type": "text"
                },
                "Blinded": {
                    "description": "Is this a blinded study (single-blind, double-blind, or open-label)?",
                    "type": "text"
                },
                "Primary Outcome": {
                    "description": "What is the primary outcome measure?",
                    "type": "text"
                },
                "Statistical Significance": {
                    "description": "Was the primary outcome statistically significant?",
                    "type": "boolean"
                },
                "Adverse Events": {
                    "description": "Were any serious adverse events reported?",
                    "type": "boolean"
                },
                "Study Quality": {
                    "description": "Rate the overall quality of the study methodology",
                    "type": "score",
                    "options": {"min": 1, "max": 10, "step": 1}
                }
            }
        },
        {
            "id": "systematic_review",
            "name": "Systematic Review",
            "description": "Analyze systematic reviews and meta-analyses",
            "category": "Medical Research",
            "columns": {
                "Search Strategy": {
                    "description": "Is the search strategy clearly described?",
                    "type": "boolean"
                },
                "Databases Searched": {
                    "description": "Which databases were searched? (list them)",
                    "type": "text"
                },
                "Studies Included": {
                    "description": "How many studies were included in the final analysis?",
                    "type": "text"
                },
                "Total Participants": {
                    "description": "What is the total number of participants across all studies?",
                    "type": "text"
                },
                "Risk of Bias": {
                    "description": "Was risk of bias assessment performed?",
                    "type": "boolean"
                },
                "Meta-Analysis": {
                    "description": "Was a meta-analysis conducted?",
                    "type": "boolean"
                },
                "GRADE Assessment": {
                    "description": "Was GRADE used to assess quality of evidence?",
                    "type": "boolean"
                },
                "Evidence Quality": {
                    "description": "Rate the overall quality of evidence presented",
                    "type": "score",
                    "options": {"min": 1, "max": 5, "step": 1}
                }
            }
        },
        {
            "id": "drug_discovery",
            "name": "Drug Discovery",
            "description": "Extract drug discovery and development information",
            "category": "Pharmaceutical",
            "columns": {
                "Drug Name": {
                    "description": "What is the name or identifier of the drug/compound?",
                    "type": "text"
                },
                "Target": {
                    "description": "What is the molecular target?",
                    "type": "text"
                },
                "In Vitro": {
                    "description": "Were in vitro studies performed?",
                    "type": "boolean"
                },
                "In Vivo": {
                    "description": "Were in vivo/animal studies performed?",
                    "type": "boolean"
                },
                "IC50/EC50": {
                    "description": "What is the IC50 or EC50 value (if reported)?",
                    "type": "text"
                },
                "Toxicity": {
                    "description": "Were toxicity studies performed?",
                    "type": "boolean"
                },
                "Development Stage": {
                    "description": "What stage of development? (preclinical, phase I, II, III)",
                    "type": "text"
                }
            }
        },
        {
            "id": "epidemiology",
            "name": "Epidemiological Study",
            "description": "Key metrics for epidemiological research",
            "category": "Public Health",
            "columns": {
                "Study Design": {
                    "description": "What is the epidemiological study design?",
                    "type": "text"
                },
                "Population": {
                    "description": "Describe the study population",
                    "type": "text"
                },
                "Exposure": {
                    "description": "What is the primary exposure or risk factor?",
                    "type": "text"
                },
                "Outcome": {
                    "description": "What is the primary health outcome?",
                    "type": "text"
                },
                "Follow-up Period": {
                    "description": "What is the follow-up period (if applicable)?",
                    "type": "text"
                },
                "Confounders Adjusted": {
                    "description": "Were confounders adjusted for in the analysis?",
                    "type": "boolean"
                },
                "Risk Estimate": {
                    "description": "What is the main risk estimate (OR, RR, HR)?",
                    "type": "text"
                }
            }
        },
        {
            "id": "basic_research",
            "name": "Basic Science",
            "description": "For molecular biology and basic science papers",
            "category": "Basic Science",
            "columns": {
                "Model System": {
                    "description": "What model system was used? (cell line, organism)",
                    "type": "text"
                },
                "Key Finding": {
                    "description": "What is the main scientific finding?",
                    "type": "text"
                },
                "Mechanism": {
                    "description": "Is a molecular mechanism proposed?",
                    "type": "boolean"
                },
                "Novel": {
                    "description": "Is this finding claimed to be novel?",
                    "type": "boolean"
                },
                "Validation": {
                    "description": "Were findings validated with multiple methods?",
                    "type": "boolean"
                },
                "Clinical Relevance": {
                    "description": "Is clinical relevance discussed?",
                    "type": "boolean"
                },
                "Innovation Score": {
                    "description": "Rate the innovation/novelty of the research",
                    "type": "score",
                    "options": {"min": 1, "max": 10, "step": 1}
                }
            }
        }
    ]
    
    return {
        "presets": presets,
        "categories": ["Core Analysis", "Medical Research", "Pharmaceutical", "Public Health", "Basic Science"]
    }


# ================== INDIVIDUAL ARTICLE RESEARCH ENDPOINTS ==================

@router.get("/groups/{group_id}/articles/{article_id}")
async def get_article_workbench_data(
    group_id: str,
    article_id: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get complete workbench data for an article in a group."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.get_workbench_data(current_user.user_id, group_id, article_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.put("/groups/{group_id}/articles/{article_id}/notes")
async def update_article_notes(
    group_id: str,
    article_id: str,
    request: UpdateNotesRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update research notes for an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.update_notes(current_user.user_id, group_id, article_id, request.notes)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.put("/groups/{group_id}/articles/{article_id}/metadata")
async def update_article_metadata(
    group_id: str,
    article_id: str,
    request: UpdateMetadataRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update workbench metadata for an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.update_metadata(current_user.user_id, group_id, article_id, request.metadata)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.post("/groups/{group_id}/articles/{article_id}/extract-feature")
async def extract_article_feature(
    group_id: str,
    article_id: str,
    request: ExtractFeatureRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a single feature from an article using AI."""
    workbench_service = ArticleWorkbenchService(db, extraction_service)
    
    result = workbench_service.extract_feature(
        current_user.user_id, 
        group_id, 
        article_id,
        request.feature_name,
        request.feature_type,
        request.extraction_prompt
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


@router.delete("/groups/{group_id}/articles/{article_id}/features/{feature_name}")
async def delete_article_feature(
    group_id: str,
    article_id: str,
    feature_name: str,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Delete a specific feature from an article."""
    workbench_service = ArticleWorkbenchService(db)
    result = workbench_service.delete_feature(current_user.user_id, group_id, article_id, feature_name)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found in group or access denied"
        )
    
    return result


# ================== BATCH OPERATIONS ==================

@router.post("/groups/{group_id}/batch/extract-features")
async def batch_extract_features(
    group_id: str,
    request: BatchExtractFeaturesRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service),
    db: Session = Depends(get_db)
):
    """Extract a feature across multiple articles in a group."""
    workbench_service = ArticleWorkbenchService(db, extraction_service)
    
    result = workbench_service.batch_extract_features(
        current_user.user_id,
        group_id,
        request.article_ids,
        request.feature_name,
        request.feature_type,
        request.extraction_prompt
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


@router.put("/groups/{group_id}/batch/metadata")
async def batch_update_metadata(
    group_id: str,
    request: BatchUpdateMetadataRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Update metadata for multiple articles in a group."""
    workbench_service = ArticleWorkbenchService(db)
    
    result = workbench_service.batch_update_metadata(
        current_user.user_id,
        group_id,
        request.metadata_updates
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return result


# ================== CONVENIENCE/LEGACY ENDPOINTS ==================

@router.post("/groups/{group_id}/save", response_model=ArticleGroupSaveResponse)
async def save_workbench_state(
    group_id: str,
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Save workbench state (articles + columns) to existing group."""
    group_service = ArticleGroupService(db)
    result = group_service.save_tabelizer_state(current_user.user_id, group_id, request)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return result


@router.post("/groups/create-and-save", response_model=ArticleGroupSaveResponse)
async def create_and_save_group(
    request: SaveToGroupRequest,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Create a new group and save workbench state to it."""
    group_service = ArticleGroupService(db)
    return group_service.create_and_save_group(current_user.user_id, request)