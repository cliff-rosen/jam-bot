from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class QuestionAnalysis(BaseModel):
    """Schema for question analysis results"""
    key_components: List[str]
    scope_boundaries: List[str]
    success_criteria: List[str]
    conflicting_viewpoints: List[str]
    confidence_score: float = Field(ge=0, le=100)

class SearchResult(BaseModel):
    """Schema for search results"""
    title: str
    url: str
    snippet: str
    displayLink: Optional[str] = None
    pagemap: Optional[Dict[str, Any]] = None

class URLContent(BaseModel):
    """Schema for URL content"""
    url: str
    content: str
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class FetchURLsRequest(BaseModel):
    """Schema for URL fetch requests"""
    urls: List[str]
    include_metadata: bool = True
    max_length: Optional[int] = Field(default=1000, ge=1, le=10000) 