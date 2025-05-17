import aiohttp
import logging
from typing import List, Dict, Any
from datetime import datetime
from xml.etree import ElementTree

logger = logging.getLogger(__name__)

class PubMedService:
    """Service for interacting with the PubMed API"""
    
    def __init__(self):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.db = "pubmed"
        # Optional: Add your API key here if you have one
        self.api_key = None
        logger.info("PubMedService initialized with base URL: %s", self.base_url)
    
    async def search(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Search PubMed for articles matching the query
        
        Args:
            query: The search query
            max_results: Maximum number of results to return (default: 10)
            
        Returns:
            List of article data dictionaries
        """
        logger.info("Starting PubMed search with query: '%s', max_results: %d", query, max_results)
        try:
            # First get the article IDs
            logger.debug("Fetching article IDs for query")
            ids = await self._search_for_ids(query, max_results)
            if not ids:
                logger.info("No results found for query: '%s'", query)
                return []
            
            logger.info("Found %d article IDs for query '%s'", len(ids), query)
            logger.debug("Article IDs: %s", ids)
                
            # Then fetch the details for those IDs
            logger.debug("Fetching article details")
            articles = await self._fetch_article_details(ids)
            logger.info("Successfully retrieved %d article details", len(articles))
            return articles
            
        except Exception as e:
            logger.error("Error during PubMed search: %s", str(e), exc_info=True)
            raise
    
    async def _search_for_ids(self, query: str, max_results: int) -> List[str]:
        """Search for article IDs matching the query"""
        params = {
            "db": self.db,
            "term": query,
            "retmax": str(max_results),
            "retmode": "json",
            "sort": "relevance"
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        logger.debug("Making PubMed esearch API call with params: %s", params)
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/esearch.fcgi", params=params) as response:
                if response.status != 200:
                    error_msg = f"PubMed API error: {response.status}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
                data = await response.json()
                logger.debug("Received esearch response: %s", data)
                ids = data.get("esearchresult", {}).get("idlist", [])
                logger.info("Retrieved %d article IDs from esearch", len(ids))
                return ids
    
    async def _fetch_article_details(self, ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch detailed information for a list of article IDs"""
        params = {
            "db": self.db,
            "id": ",".join(ids),
            "retmode": "xml"
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        logger.debug("Making PubMed efetch API call with params: %s", params)
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/efetch.fcgi", params=params) as response:
                if response.status != 200:
                    error_msg = f"PubMed API error: {response.status}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
                xml_data = await response.text()
                logger.debug("Received XML response of length: %d", len(xml_data))
                articles = self._parse_pubmed_xml(xml_data)
                logger.info("Successfully parsed %d articles from XML", len(articles))
                return articles
    
    def _parse_pubmed_xml(self, xml_data: str) -> List[Dict[str, Any]]:
        """Parse PubMed XML response into article data"""
        logger.debug("Starting XML parsing")
        root = ElementTree.fromstring(xml_data)
        articles = []
        
        for article in root.findall(".//PubmedArticle"):
            try:
                # Get basic citation info
                citation = article.find(".//MedlineCitation")
                if citation is None:
                    logger.warning("Missing MedlineCitation element in article")
                    continue
                    
                # Get article info
                article_elem = citation.find("Article")
                if article_elem is None:
                    logger.warning("Missing Article element in citation")
                    continue
                    
                # Extract data
                pmid = citation.find("PMID")
                title = article_elem.find("ArticleTitle")
                abstract = article_elem.find(".//Abstract/AbstractText")
                journal = article_elem.find("Journal/Title")
                pub_date = article_elem.find(".//PubDate")
                
                # Build article data
                article_data = {
                    "id": pmid.text if pmid is not None else None,
                    "title": title.text if title is not None else "No title available",
                    "abstract": abstract.text if abstract is not None else "No abstract available",
                    "journal": journal.text if journal is not None else "Unknown journal",
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid.text}/" if pmid is not None else None,
                    "publication_date": self._parse_pub_date(pub_date) if pub_date is not None else None
                }
                
                logger.debug("Parsed article ID %s: %s", article_data["id"], article_data["title"])
                articles.append(article_data)
                
            except Exception as e:
                logger.error("Error parsing article: %s", str(e), exc_info=True)
                continue
                
        logger.info("Completed parsing %d articles from XML", len(articles))
        return articles
    
    def _parse_pub_date(self, pub_date_elem: ElementTree.Element) -> str:
        """Parse publication date from PubMed XML"""
        try:
            year = pub_date_elem.find("Year")
            month = pub_date_elem.find("Month")
            day = pub_date_elem.find("Day")
            
            date_parts = []
            if year is not None:
                date_parts.append(year.text)
            if month is not None:
                date_parts.append(month.text.zfill(2))
            if day is not None:
                date_parts.append(day.text.zfill(2))
                
            date_str = "-".join(date_parts)
            logger.debug("Parsed publication date: %s", date_str)
            return date_str
            
        except Exception as e:
            logger.error("Error parsing publication date: %s", str(e))
            return None

# Create a singleton instance
pubmed_service = PubMedService()

__all__ = ['pubmed_service'] 