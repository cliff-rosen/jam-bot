"""
Centralized configuration for archetype extraction to ensure schema and instructions stay aligned.
"""

from typing import Dict, Any
from schemas.entity_extraction import StudyType


# Base instruction template with placeholder for study types  
_BASE_INSTRUCTION_TEMPLATE = """
## archetype
Generate a single natural-language sentence that captures the study's core structure by instantiating one of the canonical patterns below. Use specific terms from the article (actual population, condition, intervention, etc.) rather than placeholders.

**Intervention Studies:**
- Population P was treated for condition C with intervention I to study outcome O
- Intervention I was compared to control C in population P to measure outcome O  
- Population P received intervention I versus comparator C to assess efficacy for outcome O

**Observational Studies:**
- Population P with exposure E was observed for outcome O compared to unexposed controls
- Population P was followed over time T to identify factors F associated with outcome O
- Cases with condition C were compared to controls without C to identify risk factors F

**Diagnostic/Screening Studies:**
- Test T was evaluated in population P to diagnose condition C compared to reference standard R
- Screening method S was assessed in population P to detect condition C

**Prognostic Studies:**
- Population P with condition C was followed to identify predictors F of outcome O
- Patients with disease D were monitored over time T to determine factors F affecting prognosis P

**Cross-sectional Studies:**
- Population P was surveyed to measure prevalence of condition C and associations with factors F
- Sample S was assessed at timepoint T to examine relationship between exposure E and outcome O

**Systematic Reviews/Meta-analyses:**
- Studies examining intervention I for condition C were systematically reviewed to assess outcome O
- Data from N studies of treatment T versus control C were pooled to evaluate effect on outcome O

## study_type
Classify the study design as one of: {{{study_type_options}}}
"""


def _get_study_type_options() -> str:
    """Generate study type options string from enum values."""
    return ", ".join(e.value for e in StudyType)


# Centralized archetype extraction configuration
ARCHETYPE_EXTRACTION_CONFIG = {
    "result_schema": {
        "type": "object",
        "properties": {
            "archetype": {
                "type": "string", 
                "description": "Plain natural language archetype of the study"
            },
            "study_type": {
                "type": "string",
                "description": "High-level study category",
                "enum": [e.value for e in StudyType]
            }
        },
        "required": ["archetype"]
    },
    
    "schema_key": "article_archetype"
}


def get_archetype_schema() -> Dict[str, Any]:
    """Get the result schema for archetype extraction."""
    return ARCHETYPE_EXTRACTION_CONFIG["result_schema"]


def get_archetype_instructions() -> str:
    """Get the extraction instructions for archetype extraction."""
    return _BASE_INSTRUCTION_TEMPLATE.format(study_type_options=_get_study_type_options())


def get_archetype_schema_key() -> str:
    """Get the schema key for caching prompt caller."""
    return ARCHETYPE_EXTRACTION_CONFIG["schema_key"]


def validate_study_type(study_type: str) -> bool:
    """Validate that study_type is one of the allowed values."""
    return study_type in [e.value for e in StudyType]