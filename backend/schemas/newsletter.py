from pydantic import BaseModel
from datetime import date
from typing import Optional

class Newsletter(BaseModel):
    id: Optional[int] = None
    source_name: str
    issue_identifier: Optional[str] = None
    email_date: date
    subject_line: Optional[str] = None
    raw_content: Optional[str] = None
    cleaned_content: Optional[str] = None
    extraction: Optional[dict] = None
    processed_status: Optional[str] = None

class NewsletterExtractionRange(BaseModel):
    min_id: int
    max_id: int 