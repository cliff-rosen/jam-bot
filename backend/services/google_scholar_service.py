"""
Google Scholar Service

This service provides Google Scholar search functionality through the SerpAPI,
allowing users to search academic literature with various filtering options.
Follows the same abstraction pattern as PubMed service with a proper Article class.
"""

import os
import requests
import re
from typing import List, Dict, Any, Optional, Tuple, TYPE_CHECKING
from datetime import datetime
import logging

if TYPE_CHECKING:
    from schemas.canonical_types import CanonicalResearchArticle

logger = logging.getLogger(__name__)


class GoogleScholarArticle:
    """
    Google Scholar specific article representation.
    Follows the same pattern as PubMed's Article class for consistency.
    """
    
    @staticmethod
    def _safe_string_split(value: Any, delimiter: str = ",") -> List[str]:
        """Safely split a value that might be a string or list."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(delimiter) if item.strip()]
        elif isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        else:
            return []
    
    @staticmethod
    def _extract_author_names(authors_data: Any) -> List[str]:
        """
        Extract author names from various SerpAPI author data formats.
        
        Args:
            authors_data: Can be string, list of strings, or list of dicts
            
        Returns:
            List of author names as strings
        """
        if isinstance(authors_data, str):
            # Simple comma-separated string
            return [name.strip() for name in authors_data.split(",") if name.strip()]
        elif isinstance(authors_data, list):
            author_names = []
            for item in authors_data:
                if isinstance(item, dict):
                    # Dictionary format: {'name': 'Author Name', 'link': '...', ...}
                    name = item.get('name', '').strip()
                    if name:
                        author_names.append(name)
                elif isinstance(item, str):
                    # Simple string format
                    name = item.strip()
                    if name:
                        author_names.append(name)
            return author_names
        else:
            return []
    
    @classmethod
    def from_serpapi_result(cls, result: Dict[str, Any], position: int = 0) -> 'GoogleScholarArticle':
        """
        Parse a single SerpAPI search result into a GoogleScholarArticle.
        
        Args:
            result: Raw result dictionary from SerpAPI
            position: Position in search results (for debugging)
            
        Returns:
            GoogleScholarArticle instance
        """
        # Extract title
        title = result.get("title", "").strip()
        if not title:
            raise ValueError(f"No title found for result at position {position}")
        
        # Extract link
        link = result.get("link", "")
        
        # Extract authors - SerpAPI can provide these in multiple locations
        authors = []
        publication_info = result.get("publication_info", {})
        
        # Debug logging for author extraction
        logger.debug(f"Position {position}: Extracting authors from result")
        logger.debug(f"  - result.keys(): {list(result.keys())}")
        logger.debug(f"  - publication_info type: {type(publication_info)}")
        if isinstance(publication_info, dict):
            logger.debug(f"  - publication_info.keys(): {list(publication_info.keys())}")
            logger.debug(f"  - publication_info.authors: {publication_info.get('authors', 'NOT_FOUND')}")
        logger.debug(f"  - result.authors: {result.get('authors', 'NOT_FOUND')}")
        
        # Try multiple locations for authors, in order of preference
        authors_data = None
        
        # 1. Check directly in result (most common location based on your example)
        if "authors" in result and result["authors"]:
            authors_data = result["authors"]
            logger.debug(f"  - Found authors directly in result: {authors_data}")
        
        # 2. Check in publication_info.authors (nested structure)
        elif publication_info and isinstance(publication_info, dict) and "authors" in publication_info:
            authors_data = publication_info["authors"]
            logger.debug(f"  - Found authors in publication_info: {authors_data}")
        
        # 3. Check if publication_info itself contains author information as a string
        elif isinstance(publication_info, dict) and "summary" in publication_info:
            # Sometimes authors are embedded in the summary string
            summary = publication_info["summary"]
            if summary and isinstance(summary, str):
                # Look for author patterns in the summary (e.g., "Author1, Author2 - Journal")
                parts = summary.split(" - ")
                if len(parts) > 1:
                    potential_authors = parts[0].strip()
                    if potential_authors and not any(char.isdigit() for char in potential_authors):
                        authors_data = potential_authors
                        logger.debug(f"  - Found potential authors in publication_info.summary: {authors_data}")
        
        # Extract author names if we found any data
        if authors_data:
            authors = cls._extract_author_names(authors_data)
        
        logger.debug(f"  - Final extracted authors: {authors}")
        
        # Extract publication info
        pub_info_str = ""
        if publication_info and isinstance(publication_info, dict):
            summary = publication_info.get("summary", "")
            if summary:
                pub_info_str = summary
        elif isinstance(result.get("publication_info"), str):
            pub_info_str = result["publication_info"]
        
        # Extract year from publication info
        year = None
        if pub_info_str:
            year_match = re.search(r'\b(19|20)\d{2}\b', pub_info_str)
            if year_match:
                year = int(year_match.group())
        
        # Extract snippet (abstract)
        snippet = result.get("snippet", "")
        if not snippet:
            # Try alternative fields
            snippet = result.get("abstract", "") or result.get("summary", "")
            if snippet:
                logger.debug(f"Found abstract in alternative field for position {position}")
        
        if not snippet:
            logger.warning(f"No snippet/abstract found for: {title[:50]}...")
        
        # Extract citation info
        cited_by_count = None
        cited_by_link = ""
        inline_links = result.get("inline_links", {})
        if inline_links:
            cited_by_data = inline_links.get("cited_by", {})
            if cited_by_data:
                cited_by_link = cited_by_data.get("link", "")
                # Try to extract count from the text (e.g., "Cited by 123")
                cited_text = cited_by_data.get("text", "")
                if cited_text:
                    count_match = re.search(r'\d+', cited_text)
                    if count_match:
                        cited_by_count = int(count_match.group())
        
        # Extract related links
        related_pages_link = ""
        versions_link = ""
        if inline_links:
            related = inline_links.get("related_pages", {})
            if related:
                related_pages_link = related.get("link", "")
            
            versions = inline_links.get("versions", {})
            if versions:
                versions_link = versions.get("link", "")
        
        # Extract PDF link if available
        pdf_link = ""
        resources = result.get("resources", [])
        if resources:
            for resource in resources:
                if resource.get("file_format") == "PDF":
                    pdf_link = resource.get("link", "")
                    break
        
        # Extract DOI if present in the result
        doi = None
        if link:
            doi_match = re.search(r'10\.\d{4,}(?:\.\d+)*\/[-._;()\/:a-zA-Z0-9]+', link)
            if doi_match:
                doi = doi_match.group()
        
        # Extract journal/venue from publication info
        journal = None
        if pub_info_str:
            # Try to extract journal name (usually before year)
            parts = pub_info_str.split(',')
            if len(parts) >= 2:
                # Journal is often the second part after authors
                potential_journal = parts[-2].strip() if year else parts[-1].strip()
                # Clean up the journal name
                potential_journal = re.sub(r'\d{4}.*$', '', potential_journal).strip()
                if potential_journal:
                    journal = potential_journal
        
        return GoogleScholarArticle(
            title=title,
            link=link,
            authors=authors,
            publication_info=pub_info_str,
            snippet=snippet,
            year=year,
            journal=journal,
            doi=doi,
            cited_by_count=cited_by_count,
            cited_by_link=cited_by_link,
            related_pages_link=related_pages_link,
            versions_link=versions_link,
            pdf_link=pdf_link,
            position=position
        )
    
    def __init__(self, **kwargs: Any) -> None:
        """Initialize GoogleScholarArticle with provided fields."""
        self.title: str = kwargs.get('title', '')
        self.link: str = kwargs.get('link', '')
        self.authors: List[str] = kwargs.get('authors', [])
        self.publication_info: str = kwargs.get('publication_info', '')
        self.snippet: str = kwargs.get('snippet', '')
        self.year: Optional[int] = kwargs.get('year')
        self.journal: Optional[str] = kwargs.get('journal')
        self.doi: Optional[str] = kwargs.get('doi')
        self.cited_by_count: Optional[int] = kwargs.get('cited_by_count')
        self.cited_by_link: str = kwargs.get('cited_by_link', '')
        self.related_pages_link: str = kwargs.get('related_pages_link', '')
        self.versions_link: str = kwargs.get('versions_link', '')
        self.pdf_link: str = kwargs.get('pdf_link', '')
        self.position: int = kwargs.get('position', 0)
        
        # Generate a unique ID for this article
        self.id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a unique ID for the article."""
        # Use DOI if available
        if self.doi:
            return f"doi:{self.doi}"
        
        # Otherwise create ID from title and first author
        title_part = re.sub(r'[^a-zA-Z0-9]', '', self.title[:30]).lower()
        author_part = ""
        if self.authors:
            first_author = self.authors[0]
            # Extract last name (assume it's the last word)
            author_parts = first_author.split()
            if author_parts:
                author_part = author_parts[-1].lower()
        
        year_part = str(self.year) if self.year else "nodate"
        
        return f"scholar_{author_part}_{year_part}_{title_part}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            'id': self.id,
            'title': self.title,
            'link': self.link,
            'authors': self.authors,
            'publication_info': self.publication_info,
            'snippet': self.snippet,
            'year': self.year,
            'journal': self.journal,
            'doi': self.doi,
            'cited_by_count': self.cited_by_count,
            'cited_by_link': self.cited_by_link,
            'related_pages_link': self.related_pages_link,
            'versions_link': self.versions_link,
            'pdf_link': self.pdf_link
        }
    
    def __repr__(self) -> str:
        """String representation for debugging."""
        return f"GoogleScholarArticle(id={self.id}, title={self.title[:50]}..., authors={len(self.authors)} authors)"


class GoogleScholarService:
    """Service for interacting with Google Scholar via SerpAPI."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Google Scholar service.
        
        Args:
            api_key: SerpAPI key. If not provided, will look for SERPAPI_KEY env var.
        """
        self.api_key = api_key or os.getenv("SERPAPI_KEY")
        if not self.api_key:
            logger.warning("No SerpAPI key provided. Set SERPAPI_KEY environment variable.")
        
        self.base_url = "https://serpapi.com/search"
    
    def search_articles(
        self,
        query: str,
        num_results: int = 10,
        year_low: Optional[int] = None,
        year_high: Optional[int] = None,
        sort_by: str = "relevance",
        start_index: int = 0
    ) -> Tuple[List['CanonicalResearchArticle'], Dict[str, Any]]:
        """
        Search Google Scholar for academic articles.
        
        Args:
            query: Search query string
            num_results: Number of results to return (1-100)
            year_low: Optional minimum year filter
            year_high: Optional maximum year filter
            sort_by: Sort by "relevance" or "date"
            start_index: Starting index for pagination
            
        Returns:
            Tuple of (list of CanonicalResearchArticle objects, metadata dict)
        """
        if not self.api_key:
            raise ValueError("No API key available. Please set SERPAPI_KEY environment variable.")
        
        # Ensure num_results is within bounds
        num_results = max(1, min(100, num_results))  # Clamp to 1-100
        
        # Build API parameters
        params = {
            "engine": "google_scholar",
            "q": query,
            "api_key": self.api_key,
            "num": num_results
        }
        
        # Only add start parameter if we're not on the first page
        if start_index > 0:
            params["start"] = start_index
        
        # Add optional parameters
        if year_low:
            params["as_ylo"] = year_low
        if year_high:
            params["as_yhi"] = year_high
        if sort_by == "date":
            params["scisbd"] = 1  # Sort by date
            
        logger.info(f"Searching Google Scholar for: {query} (num_results={num_results}, start_index={start_index})")
        logger.debug(f"Scholar API params: {params}")
        
        # Add a unique identifier to help detect if we're getting cached results
        if start_index > 0:
            logger.info(f"PAGINATION REQUEST: start={start_index}, query hash={hash(query) % 10000}")
        
        # Make API request
        start_time = datetime.now()
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f"SerpAPI request failed: {e}")
            raise Exception(f"Failed to search Google Scholar: {str(e)}")
            
        search_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        data = response.json()
        
        # Debug: Log SerpAPI response structure for pagination debugging
        logger.debug(f"SerpAPI response keys: {list(data.keys())}")
        if "search_metadata" in data:
            logger.info(f"Search metadata: {data['search_metadata']}")
        if "serpapi_pagination" in data:
            logger.debug(f"Pagination info: {data['serpapi_pagination']}")
        
        # Debug: Log organic_results count vs requested
        organic_results = data.get("organic_results", [])
        logger.info(f"Google Scholar API returned {len(organic_results)} organic results (requested {num_results})")
        if len(organic_results) < num_results:
            logger.warning(f"Google Scholar returned fewer results than requested: got {len(organic_results)}, requested {num_results}")
            
        # Check for SerpAPI warnings or notices
        if "search_parameters" in data:
            actual_params = data["search_parameters"]
            logger.debug(f"Actual search parameters used by SerpAPI: {actual_params}")
            if actual_params.get("num") != num_results:
                logger.warning(f"SerpAPI used different num parameter: requested {num_results}, used {actual_params.get('num')}")
                
        # Log any SerpAPI-specific information
        if "search_information" in data:
            search_info = data["search_information"]
            if "organic_results_state" in search_info:
                logger.info(f"Organic results state: {search_info['organic_results_state']}")
            if "total_results" in search_info:
                logger.info(f"Total results available: {search_info['total_results']}")
        
        # Check for API errors
        if "error" in data:
            raise Exception(f"SerpAPI error: {data['error']}")
            
        # Parse results using our Article class
        scholar_articles = self._parse_search_results(data)
        metadata = self._extract_search_metadata(data, query, search_time_ms)
        
        # Convert GoogleScholarArticle objects to CanonicalResearchArticle
        from schemas.research_article_converters import scholar_to_research_article
        canonical_articles = []
        for i, article in enumerate(scholar_articles):
            canonical_article = scholar_to_research_article(article, position=start_index + i + 1)
            canonical_articles.append(canonical_article)
        
        # Log snippet availability for debugging
        articles_with_snippets = sum(1 for article in scholar_articles if article.snippet)
        logger.info(f"Found {len(scholar_articles)} articles from Google Scholar, {articles_with_snippets} with snippets")
        
        # Debug: Log first article title to verify pagination is working
        if canonical_articles:
            logger.debug(f"First article: {canonical_articles[0].title}")
            if len(canonical_articles) > 1:
                logger.debug(f"Second article: {canonical_articles[1].title}")
        
        return canonical_articles, metadata
    
    def _parse_search_results(self, data: Dict[str, Any]) -> List[GoogleScholarArticle]:
        """Parse SerpAPI response into GoogleScholarArticle objects."""
        organic_results = data.get("organic_results", [])
        articles = []
        
        for i, result in enumerate(organic_results):
            try:
                article = GoogleScholarArticle.from_serpapi_result(result, i)
                articles.append(article)
            except Exception as e:
                logger.warning(f"Failed to parse result {i}: {e}")
                logger.error(f"Problematic result structure: {result}")
                # Log specific fields that might be causing issues
                logger.error(f"  - title: {type(result.get('title', ''))} = {result.get('title', '')}")
                logger.error(f"  - authors: {type(result.get('authors', ''))} = {result.get('authors', '')}")
                if 'publication_info' in result:
                    pub_info = result['publication_info']
                    logger.error(f"  - publication_info type: {type(pub_info)}")
                    if isinstance(pub_info, dict):
                        logger.error(f"  - publication_info.authors: {type(pub_info.get('authors', ''))} = {pub_info.get('authors', '')}")
                continue
                
        return articles
    
    def _extract_search_metadata(self, data: Dict[str, Any], query: str, search_time_ms: int) -> Dict[str, Any]:
        """Extract metadata from the search response."""
        search_info = data.get("search_information", {})
        pagination = data.get("serpapi_pagination", {})
        search_metadata = data.get("search_metadata", {})
        
        # Try to get total results from search information
        total_results = search_info.get("total_results", 0)
        
        # Parse query time
        query_time_str = search_info.get("query_time", 0)
        query_time_ms = int(float(query_time_str) * 1000) if query_time_str else 0
        
        # Build metadata dictionary
        metadata = {
            "query": query,
            "total_results": total_results,
            "query_time_ms": query_time_ms,
            "search_time_ms": search_time_ms,
            "pagination": {
                "current": pagination.get("current", 0),
                "next": pagination.get("next", None),
                "other_pages": pagination.get("other_pages", {})
            },
            "serpapi_search_id": search_metadata.get("id", ""),
            "raw_query": search_metadata.get("raw_html_file", "")
        }
        
        return metadata
    
    def get_article_by_id(self, article_id: str) -> Optional[GoogleScholarArticle]:
        """
        Get detailed article information by ID.
        Note: This is a placeholder - Google Scholar doesn't provide a direct article lookup API.
        
        Args:
            article_id: Article identifier
            
        Returns:
            GoogleScholarArticle or None if not found
        """
        logger.warning(f"Direct article lookup not available for Google Scholar. ID: {article_id}")
        return None


# Module-level function to match PubMed pattern
def search_articles(
    query: str,
    num_results: int = 10,
    year_low: Optional[int] = None,
    year_high: Optional[int] = None,
    sort_by: str = "relevance",
    start_index: int = 0
) -> Tuple[List['CanonicalResearchArticle'], Dict[str, Any]]:
    """
    Module-level search function to match PubMed's search_articles pattern.
    """
    service = GoogleScholarService()
    return service.search_articles(
        query=query,
        num_results=num_results,
        year_low=year_low,
        year_high=year_high,
        sort_by=sort_by,
        start_index=start_index
    )
