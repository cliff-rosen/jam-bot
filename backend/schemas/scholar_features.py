"""
Google Scholar Article Feature Extraction Schema

This module defines the schema for extracting research features from Google Scholar articles.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class PoIRelevance(str, Enum):
    """Pathway of Interest relevance (melanocortin, natriuretic pathways)"""
    YES = "yes"
    NO = "no"


class DoIRelevance(str, Enum):
    """Disease of Interest relevance (dry eye, ulcerative colitis, crohn's disease, retinopathy, retinal disease)"""
    YES = "yes" 
    NO = "no"


class IsSystematic(str, Enum):
    """Whether this is a systematic study"""
    YES = "yes"
    NO = "no"


class StudyType(str, Enum):
    """Type of study conducted"""
    HUMAN_RCT = "human RCT"
    HUMAN_NON_RCT = "human non-RCT"
    NON_HUMAN_LIFE_SCIENCE = "non-human life science"
    NON_LIFE_SCIENCE = "non life science"
    NOT_A_STUDY = "not a study"


class StudyOutcome(str, Enum):
    """Primary outcome focus of the study"""
    EFFECTIVENESS = "effectiveness"
    SAFETY = "safety"
    DIAGNOSTICS = "diagnostics"
    BIOMARKER = "biomarker"
    OTHER = "other"


class ScholarArticleFeatures(BaseModel):
    """Extracted features from a Google Scholar article"""
    poi_relevance: PoIRelevance = Field(..., description="Pathway of Interest relevance")
    doi_relevance: DoIRelevance = Field(..., description="Disease of Interest relevance")
    is_systematic: IsSystematic = Field(..., description="Whether this is a systematic study")
    study_type: StudyType = Field(..., description="Type of study conducted")
    study_outcome: StudyOutcome = Field(..., description="Primary outcome focus")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence (0-1)")
    extraction_notes: Optional[str] = Field(None, description="Additional extraction notes")


# Predefined schema for the extract tool
SCHOLAR_FEATURES_SCHEMA = {
    "type": "object",
    "properties": {
        "poi_relevance": {
            "type": "string",
            "enum": ["yes", "no"],
            "description": "Pathway of Interest relevance (melanocortin, natriuretic pathways)"
        },
        "doi_relevance": {
            "type": "string", 
            "enum": ["yes", "no"],
            "description": "Disease of Interest relevance (dry eye, ulcerative colitis, crohn's disease, retinopathy, retinal disease)"
        },
        "is_systematic": {
            "type": "string",
            "enum": ["yes", "no"], 
            "description": "Whether this is a systematic study"
        },
        "study_type": {
            "type": "string",
            "enum": ["human RCT", "human non-RCT", "non-human life science", "non life science", "not a study"],
            "description": "Type of study conducted"
        },
        "study_outcome": {
            "type": "string",
            "enum": ["effectiveness", "safety", "diagnostics", "biomarker", "other"],
            "description": "Primary outcome focus of the study"
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
    "required": ["poi_relevance", "doi_relevance", "is_systematic", "study_type", "study_outcome", "confidence_score"]
}

# Extraction instructions for the LLM
SCHOLAR_FEATURES_EXTRACTION_INSTRUCTIONS = """
You are analyzing a Google Scholar academic article to extract specific research features.

FEATURE DEFINITIONS:

1. **PoI Relevance** (Pathway of Interest): 
   - Does this article relate to melanocortin or natriuretic pathways?
   - Answer: "yes" or "no"

2. **DoI Relevance** (Disease of Interest):
   - Does this article relate to dry eye, ulcerative colitis, crohn's disease, retinopathy, or retinal disease?
   - Answer: "yes" or "no"

3. **Is Systematic**:
   - Is this a systematic study? Look for: randomized controlled clinical trials (RCTs), epidemiological studies, open label trials, case reports
   - Answer: "yes" or "no"

4. **Study Type**:
   - "human RCT": randomized controlled clinical trials with humans
   - "human non-RCT": human studies that are not RCTs (observational, case studies, etc.)
   - "non-human life science": animal studies, in vitro studies, computer modeling
   - "non life science": non-biological research (engineering, physics, etc.)
   - "not a study": reviews, editorials, opinions, theoretical papers

5. **Study Outcome**:
   - "effectiveness": testing if something works/is effective
   - "safety": testing safety, adverse events, toxicity
   - "diagnostics": developing or testing diagnostic methods
   - "biomarker": identifying or validating biomarkers
   - "other": other research outcomes

6. **Confidence Score**: 
   - Rate your confidence in this extraction from 0.0 (very uncertain) to 1.0 (very certain)
   - Consider factors like: clarity of title/abstract, amount of information available, ambiguity

7. **Extraction Notes**: 
   - Brief explanation of your reasoning, especially for difficult cases

ANALYSIS APPROACH:
- Focus primarily on the title and abstract
- Look for keywords and phrases that indicate the research domain and methodology
- If information is unclear or missing, make your best judgment and reflect uncertainty in confidence_score
- Be conservative with "yes" answers - only mark as relevant if clearly related to the specified pathways/diseases
"""