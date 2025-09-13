"""
PubMed Search Designer API Router

Provides endpoints for designing and testing PubMed search strategies:
- Fetch article metadata from PubMed IDs
- Test search phrases for result counts
- Analyze coverage of search phrases against target articles
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

from schemas.canonical_types import CanonicalResearchArticle
from schemas.research_article_converters import legacy_article_to_canonical_pubmed, pubmed_to_research_article
from services.pubmed_service import fetch_articles_by_ids, search_pubmed_count
from services.auth_service import validate_token

logger = logging.getLogger(__name__)

router = APIRouter()

# Request/Response Models
class FetchArticlesRequest(BaseModel):
    pubmed_ids: List[str] = Field(description="List of PubMed IDs to fetch")

class FetchArticlesResponse(BaseModel):
    articles: List[CanonicalResearchArticle] = Field(description="Fetched articles")
    failed_ids: List[str] = Field(default=[], description="IDs that failed to fetch")

class TestSearchRequest(BaseModel):
    search_phrase: str = Field(description="PubMed search phrase to test")
    pubmed_ids: List[str] = Field(description="Target PubMed IDs to check coverage")

class TestSearchResponse(BaseModel):
    estimated_count: int = Field(description="Estimated result count from PubMed")
    coverage_count: int = Field(description="Number of target IDs covered")
    coverage_percentage: float = Field(description="Percentage of target IDs covered")
    covered_ids: List[str] = Field(description="Target IDs that would be found")
    not_covered_ids: List[str] = Field(description="Target IDs that would not be found")

class SearchCountRequest(BaseModel):
    search_phrase: str = Field(description="PubMed search phrase to count")

class SearchCountResponse(BaseModel):
    count: int = Field(description="Estimated result count")


@router.post("/fetch-articles", response_model=FetchArticlesResponse)
async def fetch_pubmed_articles(
    request: FetchArticlesRequest,
    current_user=Depends(validate_token)
):
    """
    Fetch article metadata for a list of PubMed IDs.

    Returns CanonicalResearchArticle objects with full metadata.
    """
    try:
        # Validate PubMed IDs (basic format check)
        valid_ids = []
        invalid_ids = []

        for pmid in request.pubmed_ids:
            # Basic validation: should be numeric and reasonable length
            if pmid.strip().isdigit() and 1 <= len(pmid.strip()) <= 10:
                valid_ids.append(pmid.strip())
            else:
                invalid_ids.append(pmid)

        if not valid_ids:
            raise HTTPException(
                status_code=400,
                detail="No valid PubMed IDs provided"
            )

        # Fetch articles from PubMed
        logger.info(f"Fetching {len(valid_ids)} PubMed articles for user {current_user.email}")

        articles_data = fetch_articles_by_ids(valid_ids)

        # Convert to CanonicalResearchArticle format
        canonical_articles = []
        failed_ids = list(invalid_ids)  # Start with invalid IDs

        for article in articles_data:
            try:
                # Convert legacy Article to CanonicalPubMedArticle
                canonical_pubmed = legacy_article_to_canonical_pubmed(article)

                # Convert to unified CanonicalResearchArticle
                canonical_research = pubmed_to_research_article(canonical_pubmed)

                canonical_articles.append(canonical_research)

            except Exception as e:
                logger.error(f"Failed to convert article {getattr(article, 'PMID', 'unknown')}: {e}")
                if hasattr(article, 'PMID'):
                    failed_ids.append(article.PMID)

        logger.info(f"Successfully converted {len(canonical_articles)} articles")

        return FetchArticlesResponse(
            articles=canonical_articles,
            failed_ids=failed_ids
        )

    except Exception as e:
        logger.error(f"Error fetching PubMed articles: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch PubMed articles: {str(e)}"
        )


@router.post("/test-search", response_model=TestSearchResponse)
async def test_search_phrase(
    request: TestSearchRequest,
    current_user=Depends(validate_token)
):
    """
    Test a PubMed search phrase for result count and coverage of target IDs.

    This endpoint:
    1. Gets the estimated result count for the search phrase
    2. Tests if each target PubMed ID would be found by the search
    3. Returns coverage statistics
    """
    try:
        logger.info(f"Testing search phrase for user {current_user.email}: {request.search_phrase}")

        # Execute the search to get actual PubMed IDs that would be returned
        from services.pubmed_service import PubMedService
        pubmed_service = PubMedService()

        # Get the IDs that the search phrase would return
        search_result_ids, total_count = pubmed_service._get_article_ids(
            request.search_phrase,
            max_results=10000  # Get a large number to ensure we capture all matches
        )

        logger.debug(f"Search '{request.search_phrase}' returned {len(search_result_ids)} IDs")
        logger.debug(f"Target PMIDs: {request.pubmed_ids}")

        # Convert search results to set for fast lookup
        search_result_set = set(search_result_ids)

        # Check which of our target PMIDs are covered by the search
        covered_ids = [pmid for pmid in request.pubmed_ids if pmid in search_result_set]
        not_covered_ids = [pmid for pmid in request.pubmed_ids if pmid not in search_result_set]

        logger.debug(f"Covered IDs: {covered_ids}")
        logger.debug(f"Not covered IDs: {not_covered_ids}")

        # Calculate coverage percentage
        total_ids = len(request.pubmed_ids)
        coverage_count = len(covered_ids)
        coverage_percentage = round((coverage_count / total_ids * 100), 1) if total_ids > 0 else 0.0

        logger.info(f"Search coverage: {coverage_count}/{total_ids} ({coverage_percentage}%)")

        return TestSearchResponse(
            estimated_count=total_count,
            coverage_count=coverage_count,
            coverage_percentage=coverage_percentage,
            covered_ids=covered_ids,
            not_covered_ids=not_covered_ids
        )

    except Exception as e:
        logger.error(f"Error testing search phrase: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test search phrase: {str(e)}"
        )


@router.post("/count-search", response_model=SearchCountResponse)
async def count_search_results(
    request: SearchCountRequest,
    current_user=Depends(validate_token)
):
    """
    Get estimated result count for a PubMed search phrase.
    """
    try:
        logger.info(f"Counting search results for user {current_user.email}: {request.search_phrase}")

        count = search_pubmed_count(request.search_phrase)

        return SearchCountResponse(count=count)

    except Exception as e:
        logger.error(f"Error counting search results: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to count search results: {str(e)}"
        )