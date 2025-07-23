"""
PubMed Search Provider Adapter

Implements the SearchProvider interface for PubMed searches.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests

from schemas.research_article_converters import pubmed_to_research_article, legacy_article_to_canonical_pubmed

from services.search_providers.base import (
    SearchProvider, UnifiedSearchParams, SearchResponse, 
    SearchMetadata, ProviderInfo
)
from services.pubmed_service import search_articles_by_date_range, get_article_ids

logger = logging.getLogger(__name__)


class PubMedAdapter(SearchProvider):
    """PubMed search provider implementation."""
    
    def __init__(self):
        self._base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        self._last_availability_check = None
        self._is_available_cache = None
        self._cache_duration = 300  # 5 minutes
    
    @property
    def provider_id(self) -> str:
        return "pubmed"
    
    @property
    def provider_info(self) -> ProviderInfo:
        return ProviderInfo(
            id="pubmed",
            name="PubMed",
            description="National Library of Medicine's database of biomedical literature",
            supported_features=[
                "abstract_search",
                "date_filtering",
                "mesh_terms",
                "full_abstracts",
                "doi_lookup",
                "completion_date_filter",
                "publication_date_filter"
            ],
            rate_limits={
                "requests_per_second": 3,
                "note": "NCBI recommends no more than 3 requests per second"
            }
        )
    
    async def search(self, params: UnifiedSearchParams) -> SearchResponse:
        """
        Perform a PubMed search.
        
        Args:
            params: Unified search parameters
            
        Returns:
            SearchResponse with articles and metadata
        """
        start_time = datetime.utcnow()
        
        try:
            # Validate parameters
            params = await self.validate_params(params)
            
            # Convert unified params to PubMed-specific search
            if params.year_low or params.year_high:
                # Use date range search
                articles = await self._search_by_date_range(params)
            else:
                # Use basic search
                articles = await self._basic_search(params)
            
            # Convert to canonical format with better IDs
            canonical_articles = []
            for i, article in enumerate(articles, 1):
                # First convert legacy Article to CanonicalPubMedArticle
                canonical_pubmed = legacy_article_to_canonical_pubmed(article)
                # Then convert to CanonicalResearchArticle
                canonical = pubmed_to_research_article(canonical_pubmed)
                # Use simple ID format
                canonical.id = f"pubmed_{article.PMID}"
                canonical.search_position = i
                canonical.relevance_score = self._estimate_relevance_score(i, len(articles))
                canonical_articles.append(canonical)
            
            # Calculate search time
            search_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Build metadata
            metadata = SearchMetadata(
                total_results=len(canonical_articles),  # PubMed doesn't always give total
                returned_results=len(canonical_articles),
                search_time=search_time,
                provider=self.provider_id,
                query_translation=params.query,  # Could parse actual query translation
                provider_metadata={
                    "date_type": params.date_type,
                    "database": "pubmed"
                }
            )
            
            return SearchResponse(
                articles=canonical_articles,
                metadata=metadata,
                success=True
            )
            
        except Exception as e:
            logger.error(f"PubMed search failed: {e}", exc_info=True)
            
            search_time = (datetime.utcnow() - start_time).total_seconds()
            
            return SearchResponse(
                articles=[],
                metadata=SearchMetadata(
                    total_results=0,
                    returned_results=0,
                    search_time=search_time,
                    provider=self.provider_id
                ),
                success=False,
                error=str(e)
            )
    
    async def is_available(self) -> bool:
        """
        Check if PubMed API is available.
        
        Returns:
            True if PubMed is accessible, False otherwise
        """
        # Use cached result if recent
        if self._last_availability_check:
            time_since_check = (datetime.utcnow() - self._last_availability_check).total_seconds()
            if time_since_check < self._cache_duration and self._is_available_cache is not None:
                return self._is_available_cache
        
        try:
            # Simple health check - search for a known PMID
            response = requests.get(
                f"{self._base_url}esummary.fcgi",
                params={"db": "pubmed", "id": "1"},
                timeout=5
            )
            
            is_available = response.status_code == 200
            
            # Cache the result
            self._is_available_cache = is_available
            self._last_availability_check = datetime.utcnow()
            
            return is_available
            
        except Exception as e:
            logger.warning(f"PubMed availability check failed: {e}")
            self._is_available_cache = False
            self._last_availability_check = datetime.utcnow()
            return False
    
    async def validate_params(self, params: UnifiedSearchParams) -> UnifiedSearchParams:
        """
        Validate and adjust parameters for PubMed.
        
        Args:
            params: Parameters to validate
            
        Returns:
            Validated parameters
        """
        # PubMed has a maximum of 10,000 results per query
        if params.num_results > 10000:
            logger.warning(f"Reducing num_results from {params.num_results} to 10000 (PubMed limit)")
            params.num_results = 10000
        
        # Default date type if using date filtering
        if (params.year_low or params.year_high) and not params.date_type:
            params.date_type = "publication"
        
        return params
    
    async def _basic_search(self, params: UnifiedSearchParams) -> List[Any]:
        """Perform a basic PubMed search without date filtering."""
        from services.pubmed_service import get_article_ids, get_articles_from_ids
        
        # Get article IDs
        article_ids = get_article_ids(params.query, params.num_results)
        
        if not article_ids:
            return []
        
        # Get full article data
        articles = get_articles_from_ids(article_ids)
        
        # Sort by date if requested
        if params.sort_by == "date":
            articles.sort(key=lambda a: a.year or "0000", reverse=True)
        
        return articles[:params.num_results]
    
    async def _search_by_date_range(self, params: UnifiedSearchParams) -> List[Any]:
        """Perform a PubMed search with date filtering."""
        # Build date strings
        start_date = f"{params.year_low or 1900}/01/01"
        end_date = f"{params.year_high or datetime.now().year}/12/31"
        
        # Use the service method that returns canonical articles directly
        canonical_articles = search_articles_by_date_range(
            filter_term=params.query,
            start_date=start_date,
            end_date=end_date
        )
        
        # Convert back to the expected format for now
        # (This is temporary until we fully migrate to canonical format)
        articles = []
        for canonical in canonical_articles:
            # Create a simple article object that the converter expects
            article = type('Article', (), {
                'PMID': canonical.pmid,
                'title': canonical.title,
                'abstract': canonical.abstract,
                'authors': ', '.join(canonical.authors),
                'journal': canonical.journal,
                'year': canonical.publication_date.split('-')[0] if canonical.publication_date else None,
                'volume': canonical.metadata.get('volume', '') if canonical.metadata else '',
                'issue': canonical.metadata.get('issue', '') if canonical.metadata else '',
                'pages': canonical.metadata.get('pages', '') if canonical.metadata else '',
                'medium': canonical.metadata.get('medium', '') if canonical.metadata else '',
                'comp_date': canonical.metadata.get('comp_date', '') if canonical.metadata else ''
            })()
            articles.append(article)
        
        # Sort by date if requested
        if params.sort_by == "date":
            articles.sort(key=lambda a: a.year or "0000", reverse=True)
        
        return articles[:params.num_results]