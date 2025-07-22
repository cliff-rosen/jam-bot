from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from sqlalchemy.orm import Session

from schemas.pubmed import PubMedArticle

from services.pubmed_service import get_article_ids_by_date_range, get_articles_from_ids

router = APIRouter(
    tags=["pubmed"]
)

@router.get("/articles/search", response_model=List[PubMedArticle])
def search_articles(
    filter_term: str = Query(..., description="The search term to filter articles by."),
    start_date: str = Query(..., description="The start date for the search range (YYYY-MM-DD)."),
    end_date: str = Query(..., description="The end date for the search range (YYYY-MM-DD).")
):
    """
    Search for PubMed articles within a specified date range.
    """
    try:
        result = get_article_ids_by_date_range(filter_term, start_date, end_date)
        if result['status_code'] != 200:
            raise HTTPException(status_code=result['status_code'], detail="Error fetching article IDs from PubMed.")
        
        article_ids = result['ids']
        if not article_ids:
            return []
        
        articles = get_articles_from_ids(article_ids)
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 