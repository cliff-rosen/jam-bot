"""
Google Scholar Service

This service provides Google Scholar search functionality through the SerpAPI,
allowing users to search academic literature with various filtering options.
"""

import os
import requests
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging

from schemas.canonical_types import CanonicalScholarArticle

logger = logging.getLogger(__name__)


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
        sort_by: str = "relevance"
    ) -> Tuple[List[CanonicalScholarArticle], Dict[str, Any]]:
        """
        Search Google Scholar for academic articles.
        
        Args:
            query: Search query string
            num_results: Number of results to return (1-20)
            year_low: Filter results from this year onwards
            year_high: Filter results up to this year
            sort_by: Sort by 'relevance' or 'date'
            
        Returns:
            Tuple of (list of articles, search metadata)
            
        Raises:
            ValueError: If API key is not set or parameters are invalid
            Exception: If API request fails
        """
        if not self.api_key:
            raise ValueError("SerpAPI key not configured")
            
        # Validate parameters
        if not query:
            raise ValueError("Query is required")
            
        num_results = max(1, min(20, num_results))  # Clamp to 1-20
        
        # Build API parameters
        params = {
            "engine": "google_scholar",
            "q": query,
            "api_key": self.api_key,
            "num": num_results
        }
        
        # Add optional parameters
        if year_low:
            params["as_ylo"] = year_low
        if year_high:
            params["as_yhi"] = year_high
        if sort_by == "date":
            params["scisbd"] = 1  # Sort by date
            
        logger.info(f"Searching Google Scholar for: {query} (num_results={num_results})")
        
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
        
        # Check for API errors
        if "error" in data:
            raise Exception(f"SerpAPI error: {data['error']}")
            
        # Parse results
        articles = self._parse_search_results(data)
        metadata = self._extract_search_metadata(data, query, search_time_ms)
        
        # Log snippet availability for debugging
        articles_with_snippets = sum(1 for article in articles if article.snippet)
        logger.info(f"Found {len(articles)} articles from Google Scholar, {articles_with_snippets} with snippets")
        
        return articles, metadata
    
    def _parse_search_results(self, data: Dict[str, Any]) -> List[CanonicalScholarArticle]:
        """Parse SerpAPI response into canonical article format."""
        organic_results = data.get("organic_results", [])
        articles = []
        
        for i, result in enumerate(organic_results):
            try:
                article = self._parse_single_result(result, i)
                articles.append(article)
            except Exception as e:
                logger.warning(f"Failed to parse result {i}: {e}")
                continue
                
        return articles
    
    def _parse_single_result(self, result: Dict[str, Any], position: int) -> CanonicalScholarArticle:
        """Parse a single search result into canonical format."""
        # Extract snippet (used as abstract)
        snippet = result.get("snippet", "")
        
        # Try alternative fields if no snippet
        if not snippet:
            # Some results might have abstract in different fields
            snippet = result.get("abstract", "") or result.get("summary", "")
            if snippet:
                logger.info(f"Found abstract in alternative field for result {position}")
        
        if not snippet:
            logger.warning(f"No snippet/abstract found for result {position}: {result.get('title', 'Unknown title')}")
            # Log the full result to help debug what SerpAPI is returning
            logger.debug(f"Full result structure: {list(result.keys())}")
        
        # Extract authors
        authors = self._extract_authors(result)
        
        # Extract publication year
        year = self._extract_year(result)
        
        # Extract citation information
        cited_by_count, cited_by_link = self._extract_citation_info(result)
        
        # Extract related links
        related_links = self._extract_related_links(result)
        
        # Extract PDF link
        pdf_link = self._extract_pdf_link(result)
        
        # Get publication info as string
        pub_info = result.get("publication_info", {})
        if isinstance(pub_info, dict):
            pub_info_str = self._format_publication_info(pub_info)
        else:
            pub_info_str = str(pub_info)
        
        return CanonicalScholarArticle(
            title=result.get("title", ""),
            link=result.get("link"),
            authors=authors,
            publication_info=pub_info_str,
            snippet=snippet,
            cited_by_count=cited_by_count,
            cited_by_link=cited_by_link,
            related_pages_link=related_links.get("related_pages"),
            versions_link=related_links.get("versions"),
            pdf_link=pdf_link,
            year=year,
            position=result.get("position", position + 1),
            metadata={
                "result_id": result.get("result_id"),
                "type": result.get("type"),
                "serpapi_link": result.get("serpapi_link")
            }
        )
    
    def _extract_authors(self, result: Dict[str, Any]) -> List[str]:
        """Extract author names from result."""
        authors = []
        pub_info = result.get("publication_info", {})
        
        if isinstance(pub_info, dict) and "authors" in pub_info:
            # Authors provided as list
            author_list = pub_info["authors"]
            if isinstance(author_list, list):
                for author in author_list:
                    if isinstance(author, dict) and "name" in author:
                        authors.append(author["name"])
                    elif isinstance(author, str):
                        authors.append(author)
        elif isinstance(pub_info, str) and " - " in pub_info:
            # Try to extract from publication info string
            potential_authors = pub_info.split(" - ")[0]
            # Basic parsing - split by comma but handle "Last, First" format
            parts = potential_authors.split(", ")
            i = 0
            while i < len(parts):
                if i + 1 < len(parts) and len(parts[i + 1].split()) == 1:
                    # Likely "Last, First" format
                    authors.append(f"{parts[i]}, {parts[i + 1]}")
                    i += 2
                else:
                    authors.append(parts[i])
                    i += 1
                    
        return authors
    
    def _extract_year(self, result: Dict[str, Any]) -> Optional[int]:
        """Extract publication year from result."""
        pub_info = result.get("publication_info", {})
        
        # Try direct year field
        if isinstance(pub_info, dict) and "year" in pub_info:
            try:
                return int(pub_info["year"])
            except (ValueError, TypeError):
                pass
                
        # Try to extract from publication info string
        pub_str = str(pub_info) if pub_info else ""
        snippet = result.get("snippet", "")
        
        # Look for 4-digit year in various places
        for text in [pub_str, snippet]:
            year_match = re.search(r'\b(19|20)\d{2}\b', text)
            if year_match:
                try:
                    return int(year_match.group())
                except ValueError:
                    pass
                    
        return None
    
    def _extract_citation_info(self, result: Dict[str, Any]) -> Tuple[Optional[int], Optional[str]]:
        """Extract citation count and link."""
        cited_by_count = None
        cited_by_link = None
        
        inline_links = result.get("inline_links", {})
        cited_by = inline_links.get("cited_by", {})
        
        if cited_by:
            cited_by_count = cited_by.get("total")
            cited_by_link = cited_by.get("link")
            
        return cited_by_count, cited_by_link
    
    def _extract_related_links(self, result: Dict[str, Any]) -> Dict[str, Optional[str]]:
        """Extract related pages and versions links."""
        links = {}
        inline_links = result.get("inline_links", {})
        
        if "related_pages" in inline_links:
            links["related_pages"] = inline_links["related_pages"].get("link")
        if "versions" in inline_links:
            links["versions"] = inline_links["versions"].get("link")
            
        return links
    
    def _extract_pdf_link(self, result: Dict[str, Any]) -> Optional[str]:
        """Extract direct PDF link if available."""
        resources = result.get("resources", [])
        
        for resource in resources:
            if resource.get("file_format") == "PDF":
                return resource.get("link")
                
        return None
    
    def _format_publication_info(self, pub_info: Dict[str, Any]) -> str:
        """Format publication info dict into string."""
        parts = []
        
        # Add authors if not already extracted
        if "authors" in pub_info and isinstance(pub_info["authors"], list):
            author_names = []
            for author in pub_info["authors"]:
                if isinstance(author, dict) and "name" in author:
                    author_names.append(author["name"])
                elif isinstance(author, str):
                    author_names.append(author)
            if author_names:
                parts.append(", ".join(author_names))
                
        # Add publication venue
        if "venue" in pub_info:
            parts.append(pub_info["venue"])
            
        # Add year
        if "year" in pub_info:
            parts.append(str(pub_info["year"]))
            
        return " - ".join(parts) if parts else ""
    
    def _extract_search_metadata(
        self, 
        data: Dict[str, Any], 
        query: str, 
        search_time_ms: int
    ) -> Dict[str, Any]:
        """Extract metadata about the search itself."""
        search_metadata = data.get("search_metadata", {})
        search_information = data.get("search_information", {})
        
        # Extract total results count from multiple possible locations
        total_results = 0
        
        # Try search_metadata first
        if "total_results" in search_metadata:
            total_results = search_metadata["total_results"]
        # Try search_information 
        elif "total_results" in search_information:
            total_results = search_information["total_results"]
        # Try the serpapi_pagination or pagination info
        elif "serpapi_pagination" in data:
            pagination = data["serpapi_pagination"]
            if "total" in pagination:
                total_results = pagination["total"]
        # Fall back to counting organic results if no total found
        else:
            organic_results = data.get("organic_results", [])
            total_results = len(organic_results)
            logger.warning(f"Could not find total_results in SerpAPI response, using organic results count: {total_results}")
            
        # Parse string results if needed
        if isinstance(total_results, str):
            # Parse strings like "About 1,230 results"
            numbers = re.findall(r'[\d,]+', total_results)
            if numbers:
                total_results = int(numbers[0].replace(',', ''))
            else:
                total_results = 0
                
        logger.info(f"Extracted total_results: {total_results} from search metadata")
                
        return {
            "total_results": total_results,
            "query_used": query,
            "search_time": search_time_ms,
            "results_returned": len(data.get("organic_results", [])),
            "serpapi_data_keys": list(data.keys()),  # For debugging
        }
    
    def get_article_citations(self, article_id: str) -> List[CanonicalScholarArticle]:
        """
        Get articles that cite a specific article.
        
        Args:
            article_id: Google Scholar article ID
            
        Returns:
            List of articles that cite the given article
        """
        # This would use the "cites" parameter in the API
        # Implementation left as future enhancement
        raise NotImplementedError("Citation lookup not yet implemented")
    
    def get_related_articles(self, article_id: str) -> List[CanonicalScholarArticle]:
        """
        Get articles related to a specific article.
        
        Args:
            article_id: Google Scholar article ID
            
        Returns:
            List of related articles
        """
        # This would follow the related_pages_link
        # Implementation left as future enhancement
        raise NotImplementedError("Related articles lookup not yet implemented")


# Create a singleton instance
_scholar_service = None


def get_google_scholar_service(api_key: Optional[str] = None) -> GoogleScholarService:
    """Get or create the Google Scholar service instance."""
    global _scholar_service
    if _scholar_service is None:
        _scholar_service = GoogleScholarService(api_key)
    return _scholar_service