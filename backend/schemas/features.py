"""
Shared Feature Schemas

Common feature definition and extraction schemas used across Smart Search and Workbench.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class FeatureDefinition(BaseModel):
    """Feature metadata - defines what features to extract"""
    id: str = Field(..., description="Stable UUID for feature identification")
    name: str = Field(..., description="Feature display name") 
    description: str = Field(..., description="Feature description for LLM extraction")
    type: Literal['boolean', 'text', 'score'] = Field(..., description="Feature data type")
    options: Optional[Dict[str, Any]] = Field(None, description="Feature options (e.g., min/max for score)")


class FeatureExtractionRequest(BaseModel):
    """Request for feature extraction"""
    features: List[FeatureDefinition] = Field(..., description="Features to extract")


class FeatureExtractionResult(BaseModel):
    """Result of feature extraction for a single article"""
    article_id: str = Field(..., description="Article identifier")
    features: Dict[str, Any] = Field(..., description="Extracted feature values keyed by feature.id")
    extraction_success: bool = Field(..., description="Whether extraction was successful")
    error_message: Optional[str] = Field(None, description="Error message if extraction failed")


class FeatureExtractionResponse(BaseModel):
    """Response from feature extraction operation"""
    results: Dict[str, Dict[str, Any]] = Field(..., description="Article ID -> Feature ID -> extracted value")
    extraction_metadata: Dict[str, Any] = Field(..., description="Metadata about the extraction operation")