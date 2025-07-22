"""
PubMed Article Feature Extraction Schema

This module defines the schema for extracting research features from PubMed articles,
similar to scholar_features.py but tailored for biomedical research.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class ClinicalRelevance(str, Enum):
    """Clinical relevance level"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class StudyDesign(str, Enum):
    """Study design type"""
    RCT = "randomized controlled trial"
    COHORT = "cohort study"
    CASE_CONTROL = "case-control study"
    CROSS_SECTIONAL = "cross-sectional study"
    CASE_REPORT = "case report"
    SYSTEMATIC_REVIEW = "systematic review"
    META_ANALYSIS = "meta-analysis"
    NARRATIVE_REVIEW = "narrative review"
    IN_VITRO = "in vitro study"
    ANIMAL_STUDY = "animal study"
    OTHER = "other"


class EvidenceLevel(str, Enum):
    """Evidence level based on study design"""
    LEVEL_1 = "level 1"  # Systematic reviews, meta-analyses of RCTs
    LEVEL_2 = "level 2"  # RCTs
    LEVEL_3 = "level 3"  # Cohort studies
    LEVEL_4 = "level 4"  # Case-control studies
    LEVEL_5 = "level 5"  # Case series, case reports
    LEVEL_6 = "level 6"  # Expert opinion, narrative reviews


class PopulationSize(str, Enum):
    """Study population size categories"""
    VERY_LARGE = "very large (>10000)"
    LARGE = "large (1000-10000)"
    MEDIUM = "medium (100-999)"
    SMALL = "small (10-99)"
    VERY_SMALL = "very small (<10)"
    NOT_APPLICABLE = "not applicable"


class PubMedArticleFeatures(BaseModel):
    """Extracted features from a PubMed article"""
    clinical_relevance: ClinicalRelevance = Field(..., description="Clinical relevance level")
    study_design: StudyDesign = Field(..., description="Type of study design")
    evidence_level: EvidenceLevel = Field(..., description="Level of evidence")
    population_size: PopulationSize = Field(..., description="Study population size category")
    
    key_findings: str = Field(..., description="Brief summary of key findings (max 200 chars)")
    methodology_quality: Literal["excellent", "good", "fair", "poor"] = Field(..., description="Quality of methodology")
    statistical_significance: Literal["yes", "no", "not reported"] = Field(..., description="Whether results are statistically significant")
    
    therapeutic_area: str = Field(..., description="Primary therapeutic area")
    intervention_type: Optional[str] = Field(None, description="Type of intervention studied")
    primary_outcome: Optional[str] = Field(None, description="Primary outcome measured")
    
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence (0-1)")
    extraction_notes: Optional[str] = Field(None, description="Additional extraction notes")
    relevance_score: int = Field(default=0, ge=0, le=10, description="Calculated relevance score (0-10)")


# Predefined schema for the extract tool
PUBMED_FEATURES_SCHEMA = {
    "type": "object",
    "properties": {
        "clinical_relevance": {
            "type": "string",
            "enum": ["high", "medium", "low", "none"],
            "description": "Clinical relevance level"
        },
        "study_design": {
            "type": "string",
            "enum": [
                "randomized controlled trial", "cohort study", "case-control study",
                "cross-sectional study", "case report", "systematic review",
                "meta-analysis", "narrative review", "in vitro study", 
                "animal study", "other"
            ],
            "description": "Type of study design"
        },
        "evidence_level": {
            "type": "string",
            "enum": ["level 1", "level 2", "level 3", "level 4", "level 5", "level 6"],
            "description": "Level of evidence based on study design"
        },
        "population_size": {
            "type": "string",
            "enum": [
                "very large (>10000)", "large (1000-10000)", "medium (100-999)",
                "small (10-99)", "very small (<10)", "not applicable"
            ],
            "description": "Study population size category"
        },
        "key_findings": {
            "type": "string",
            "maxLength": 200,
            "description": "Brief summary of key findings"
        },
        "methodology_quality": {
            "type": "string",
            "enum": ["excellent", "good", "fair", "poor"],
            "description": "Quality of methodology"
        },
        "statistical_significance": {
            "type": "string",
            "enum": ["yes", "no", "not reported"],
            "description": "Whether results are statistically significant"
        },
        "therapeutic_area": {
            "type": "string",
            "description": "Primary therapeutic area"
        },
        "intervention_type": {
            "type": "string",
            "description": "Type of intervention studied"
        },
        "primary_outcome": {
            "type": "string",
            "description": "Primary outcome measured"
        },
        "confidence_score": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Confidence in feature extraction (0-1)"
        },
        "extraction_notes": {
            "type": "string",
            "description": "Additional notes about the extraction"
        }
    },
    "required": [
        "clinical_relevance", "study_design", "evidence_level", 
        "population_size", "key_findings", "methodology_quality",
        "statistical_significance", "therapeutic_area", "confidence_score"
    ]
}

# Extraction instructions for the LLM
PUBMED_FEATURES_EXTRACTION_INSTRUCTIONS = """
You are analyzing a PubMed biomedical research article to extract specific research features.

FEATURE DEFINITIONS:

1. **Clinical Relevance**: 
   - "high": Direct clinical application, changes practice guidelines
   - "medium": Informs clinical decision-making, supports existing practices
   - "low": Basic science with potential future clinical application
   - "none": No clear clinical relevance

2. **Study Design**:
   - Identify the primary research methodology used
   - For reviews, distinguish between systematic reviews, meta-analyses, and narrative reviews
   - For experimental studies, identify if RCT, cohort, case-control, etc.

3. **Evidence Level**:
   - Level 1: Systematic reviews and meta-analyses of RCTs
   - Level 2: Individual RCTs
   - Level 3: Cohort studies
   - Level 4: Case-control studies
   - Level 5: Case series, case reports
   - Level 6: Expert opinion, narrative reviews

4. **Population Size**:
   - Extract the total number of subjects/participants
   - For meta-analyses, use total pooled sample size
   - For reviews without pooled analysis, mark as "not applicable"

5. **Key Findings**:
   - Summarize the main result in one clear sentence (max 200 characters)
   - Focus on the primary outcome

6. **Methodology Quality**:
   - "excellent": Well-designed, minimal bias, appropriate controls
   - "good": Generally well-designed with minor limitations
   - "fair": Some methodological concerns but still valuable
   - "poor": Significant methodological flaws

7. **Statistical Significance**:
   - Look for p-values, confidence intervals, or explicit statements
   - If not reported, mark as "not reported"

8. **Therapeutic Area**:
   - Identify the primary medical specialty or disease area
   - Examples: oncology, cardiology, neurology, infectious disease

9. **Intervention Type** (if applicable):
   - Drug therapy, surgical procedure, diagnostic test, behavioral intervention, etc.

10. **Primary Outcome**:
    - The main endpoint or measure the study was designed to evaluate

ANALYSIS APPROACH:
- Focus on the abstract for most information
- Look for explicit methodology statements
- Identify primary vs secondary outcomes
- Note any major limitations mentioned
- Rate your confidence based on clarity and completeness of information
"""


def calculate_pubmed_relevance_score(features: dict) -> int:
    """
    Calculate relevance score for PubMed articles based on extracted features.
    
    Args:
        features: Dictionary containing extracted features
        
    Returns:
        Relevance score (0-10)
    """
    score = 0
    
    # Clinical relevance (0-3 points)
    clinical_relevance = features.get("clinical_relevance", "").lower()
    if clinical_relevance == "high":
        score += 3
    elif clinical_relevance == "medium":
        score += 2
    elif clinical_relevance == "low":
        score += 1
    
    # Evidence level (0-3 points)
    evidence_level = features.get("evidence_level", "").lower()
    if evidence_level == "level 1":
        score += 3
    elif evidence_level == "level 2":
        score += 2.5
    elif evidence_level == "level 3":
        score += 2
    elif evidence_level == "level 4":
        score += 1.5
    elif evidence_level == "level 5":
        score += 1
    elif evidence_level == "level 6":
        score += 0.5
    
    # Study quality (0-2 points)
    methodology_quality = features.get("methodology_quality", "").lower()
    if methodology_quality == "excellent":
        score += 2
    elif methodology_quality == "good":
        score += 1.5
    elif methodology_quality == "fair":
        score += 1
    elif methodology_quality == "poor":
        score += 0.5
    
    # Population size (0-1 point)
    population_size = features.get("population_size", "").lower()
    if "very large" in population_size:
        score += 1
    elif "large" in population_size:
        score += 0.8
    elif "medium" in population_size:
        score += 0.6
    elif "small" in population_size:
        score += 0.4
    elif "very small" in population_size:
        score += 0.2
    
    # Statistical significance (0-1 point)
    statistical_significance = features.get("statistical_significance", "").lower()
    if statistical_significance == "yes":
        score += 1
    elif statistical_significance == "no":
        score += 0.3  # Still valuable for negative results
    
    return min(int(round(score)), 10)  # Cap at 10