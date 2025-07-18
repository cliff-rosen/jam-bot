from pydantic import BaseModel
from typing import Optional

class PubMedArticle(BaseModel):
    PMID: str
    comp_date: Optional[str] = None
    title: Optional[str] = None
    abstract: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    medium: Optional[str] = None

    class Config:
        from_attributes = True 