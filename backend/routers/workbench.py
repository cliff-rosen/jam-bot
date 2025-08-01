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
    ArticleGroup, ArticleGroupDetail, ArticleGroupWithDetails, FeatureDefinition
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
    feature_definitions: Optional[List[FeatureDefinition]] = Field(None, description="Feature definitions")

class UpdateArticleGroupRequest(BaseModel):
    """Request to update article group metadata"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Group name")
    description: Optional[str] = Field(None, description="Group description")
    feature_definitions: Optional[List[FeatureDefinition]] = Field(None, description="Feature definitions")

class SaveToGroupRequest(BaseModel):
    """Request to save current workbench state to a group"""
    group_name: str = Field(..., min_length=1, max_length=255, description="Group name")
    group_description: Optional[str] = Field(None, description="Group description")
    articles: List[CanonicalResearchArticle] = Field(..., description="Articles with extracted_features")
    feature_definitions: List[FeatureDefinition] = Field(..., description="Feature definitions")
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
    group: ArticleGroupWithDetails = Field(..., description="Detailed group information")

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

# New Unified Extraction Models
class FeatureDefinition(BaseModel):
    """Definition of a feature to extract"""
    id: str  # Stable UUID for feature identification
    name: str
    description: str  
    type: str = "text"  # "boolean", "text", "score"
    options: Optional[Dict[str, Any]] = None


class ExtractRequest(BaseModel):
    """Unified request to extract multiple features"""
    articles: List[Dict[str, str]]  # [{id, title, abstract}]
    features: List[FeatureDefinition]

class ExtractResponse(BaseModel):
    """Unified response with extracted feature data"""
    results: Dict[str, Dict[str, str]]  # article_id -> feature_name -> value
    metadata: Optional[Dict[str, Any]] = None

class FeaturePreset(BaseModel):
    """Pre-configured feature set"""
    id: str
    name: str
    description: str
    category: Optional[str] = None
    features: List[FeatureDefinition]

class FeaturePresetsResponse(BaseModel):
    """Response with available feature presets"""
    presets: List[FeaturePreset]


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
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(validate_token),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific group with pagination."""
    group_service = ArticleGroupService(db)
    result = group_service.get_group_detail(current_user.user_id, group_id, page, page_size)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found or access denied"
        )
    
    return ArticleGroupDetailResponse(group=result)


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

# New Unified Extraction Endpoints
@router.post("/extract", response_model=ExtractResponse)
async def extract_unified(
    request: ExtractRequest,
    current_user: User = Depends(validate_token),
    extraction_service: ExtractionService = Depends(get_extraction_service)
):
    """Unified endpoint to extract multiple columns from articles in a single LLM call."""
    try:
        # Convert features to unified extraction format
        columns = []
        for feature in request.features:
            columns.append({
                "name": feature.name,
                "description": feature.description,
                "type": feature.type,
                "options": feature.options or {}
            })
        
        results = await extraction_service.extract_unified_columns(
            request.articles, 
            columns
        )
        
        return ExtractResponse(
            results=results,
            metadata={"total_articles": len(request.articles), "total_features": len(columns)}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feature extraction failed: {str(e)}"
        )

@router.get("/feature-presets", response_model=FeaturePresetsResponse)
async def get_feature_presets(
    current_user: User = Depends(validate_token)
):
    """Get available feature presets for extraction."""
    presets = [
        FeaturePreset(
            id="research_features",
            name="Research Features",
            description="Extract research features for DOI/POI analysis",
            category="Core Analysis",
            features=[
                FeatureDefinition(
                    id="feat_poi_relevance",
                    name="poi_relevance", 
                    description="Does this article relate to melanocortin or natriuretic pathways? Melanocortin keywords: melanocortin receptor, MC1R, MC2R, MC3R, MC4R, MC5R, ACTH, α-MSH, β-MSH, γ-MSH, melanocyte, pigmentation, appetite regulation. Natriuretic keywords: natriuretic peptide, ANP, BNP, CNP, NPR-A, NPR-B, NPR-C, guanylate cyclase, cardiac function", 
                    type="boolean"
                ),
                FeatureDefinition(
                    id="feat_doi_relevance",
                    name="doi_relevance", 
                    description="Does this article relate to dry eye, ulcerative colitis, crohn's disease, retinopathy, or retinal disease? Dry eye keywords: dry eye syndrome, keratoconjunctivitis sicca, tear film. IBD keywords: inflammatory bowel disease, IBD, ulcerative colitis, Crohn's disease, colitis. Retinal keywords: retinopathy, retinal disease, diabetic retinopathy, macular degeneration, retinal degeneration", 
                    type="boolean"
                ),
                FeatureDefinition(
                    id="feat_is_systematic",
                    name="is_systematic", 
                    description="Is this a systematic study? Look for: randomized controlled clinical trials (RCTs), clinical trials, epidemiological studies, cohort studies, case-control studies, open label trials, case reports. Systematic reviews and meta-analyses should also be marked as 'yes'. Basic science, in vitro, and animal studies can also be systematic if they follow rigorous methodology", 
                    type="boolean"
                ),
                FeatureDefinition(
                    id="feat_study_type",
                    name="study_type", 
                    description="Type of study: 'human RCT' (randomized controlled clinical trials with humans), 'human non-RCT' (human studies that are not RCTs - observational, cohort, case-control, case series), 'non-human life science' (animal studies, in vitro studies, cell culture, molecular biology), 'non life science' (non-biological research), 'not a study' (reviews non-systematic, editorials, opinions, commentaries, theoretical papers)", 
                    type="text"
                ),
                FeatureDefinition(
                    id="feat_study_outcome",
                    name="study_outcome", 
                    description="Primary outcome focus: 'effectiveness' (testing if treatment/intervention works), 'safety' (testing safety, adverse events, toxicity, side effects), 'diagnostics' (developing or testing diagnostic methods), 'biomarker' (identifying or validating biomarkers non-diagnostic, prognostic markers), 'other' (basic science mechanisms, pathophysiology, epidemiology)", 
                    type="text"
                )
            ]
        ),
        FeaturePreset(
            id="clinical_trial",
            name="Clinical Trial Analysis",
            description="Extract key information from clinical trial papers",
            category="Medical Research",
            features=[
                FeatureDefinition(id="feat_clin_study_type", name="Study Type", description="What type of study is this? (e.g., RCT, observational, meta-analysis)", type="text"),
                FeatureDefinition(id="feat_clin_sample_size", name="Sample Size", description="What is the total sample size of the study?", type="text"),
                FeatureDefinition(id="feat_clin_blinded", name="Blinded", description="Is this a blinded study (single-blind, double-blind, or open-label)?", type="text"),
                FeatureDefinition(id="feat_clin_primary_outcome", name="Primary Outcome", description="What is the primary outcome measure?", type="text"),
                FeatureDefinition(id="feat_clin_statistical_sig", name="Statistical Significance", description="Was the primary outcome statistically significant?", type="boolean"),
                FeatureDefinition(id="feat_clin_adverse_events", name="Adverse Events", description="Were any serious adverse events reported?", type="boolean"),
                FeatureDefinition(id="feat_clin_study_quality", name="Study Quality", description="Rate the overall quality of the study methodology", type="score", options={"min": 1, "max": 10, "step": 1})
            ]
        ),
        FeaturePreset(
            id="systematic_review",
            name="Systematic Review",
            description="Analyze systematic reviews and meta-analyses",
            category="Medical Research",
            features=[
                FeatureDefinition(id="feat_sys_search_strategy", name="Search Strategy", description="Is the search strategy clearly described?", type="boolean"),
                FeatureDefinition(id="feat_sys_databases", name="Databases Searched", description="Which databases were searched? (list them)", type="text"),
                FeatureDefinition(id="feat_sys_studies_included", name="Studies Included", description="How many studies were included in the final analysis?", type="text"),
                FeatureDefinition(id="feat_sys_meta_analysis", name="Meta-Analysis", description="Was a meta-analysis conducted?", type="boolean"),
                FeatureDefinition(id="feat_sys_evidence_quality", name="Evidence Quality", description="Rate the overall quality of evidence presented", type="score", options={"min": 1, "max": 5, "step": 1})
            ]
        ),
        FeaturePreset(
            id="drug_discovery",
            name="Drug Discovery",
            description="Extract drug discovery and development information",
            category="Pharmaceutical",
            features=[
                FeatureDefinition(id="feat_drug_name", name="Drug Name", description="What is the name or identifier of the drug/compound?", type="text"),
                FeatureDefinition(id="feat_drug_target", name="Target", description="What is the molecular target?", type="text"),
                FeatureDefinition(id="feat_drug_in_vitro", name="In Vitro", description="Were in vitro studies performed?", type="boolean"),
                FeatureDefinition(id="feat_drug_in_vivo", name="In Vivo", description="Were in vivo/animal studies performed?", type="boolean"),
                FeatureDefinition(id="feat_drug_dev_stage", name="Development Stage", description="What stage of development? (preclinical, phase I, II, III)", type="text")
            ]
        ),
        FeaturePreset(
            id="basic_research",
            name="Basic Science",
            description="For molecular biology and basic science papers",
            category="Basic Science",
            features=[
                FeatureDefinition(id="feat_basic_model_system", name="Model System", description="What model system was used? (cell line, organism)", type="text"),
                FeatureDefinition(id="feat_basic_key_finding", name="Key Finding", description="What is the main scientific finding?", type="text"),
                FeatureDefinition(id="feat_basic_mechanism", name="Mechanism", description="Is a molecular mechanism proposed?", type="boolean"),
                FeatureDefinition(id="feat_basic_novel", name="Novel", description="Is this finding claimed to be novel?", type="boolean"),
                FeatureDefinition(id="feat_basic_innovation_score", name="Innovation Score", description="Rate the innovation/novelty of the research", type="score", options={"min": 1, "max": 10, "step": 1})
            ]
        )
    ]
    
    return FeaturePresetsResponse(
        presets=presets
    )



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
    
    result = await workbench_service.extract_feature(
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
    
    result = await workbench_service.batch_extract_features(
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


