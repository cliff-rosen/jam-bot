import requests
import xml.etree.ElementTree as ET
import urllib.parse
import logging
import time
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

"""
DOCS
https://www.ncbi.nlm.nih.gov/books/NBK25501/
https://www.ncbi.nlm.nih.gov/books/NBK25499/

SAMPLE CALLS
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=%28%28melanocortin%29%20OR%20%28natriuretic%29%20OR%20%28Dry%20eye%29%20OR%20%28Ulcerative%20colitis%29%20OR%20%28Crohn%E2%80%99s%20disease%29%20OR%20%28Retinopathy%29%20OR%20%28Retinal%20disease%29%29AND%20%28%28%222023/11/01%3E%22%5BDate%20-%20Completion%5D%20%3A%20%222023/11/30%22%5BDate%20-%20Completion%5D%29%29&retmax=10000&retmode=json
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=38004229&retmode=xml

"""
PUBMED_API_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_API_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
RETMAX = "10000"
FILTER_TERM = "(melanocortin) OR (natriuretic) OR (Dry eye) OR (Ulcerative colitis) OR (Crohn’s disease) OR (Retinopathy) OR (Retinal disease)"

class Article():
    """
    PubmedArticle
        MedlineCitation
            PMID
            Article (PubModel)
                Journal
                    JournalIssue (CitedMedium)
                        Volume
                        Issue
                        PubDate
                    Title
                ArticleTitle
                Pagination
                Abstract
                AuthorList

    """

    @classmethod
    def from_xml(cls, article_xml: bytes) -> 'Article':
        pubmed_article_node = ET.fromstring(article_xml)
        medline_citation_node = pubmed_article_node.find('.//MedlineCitation')

        PMID_node = medline_citation_node.find(".//PMID")
        article_node = medline_citation_node.find('.//Article')
        date_completed_node = medline_citation_node.find(".//DateCompleted")
        date_revised_node = medline_citation_node.find(".//DateRevised")
        article_date_node = article_node.find(".//ArticleDate") if article_node is not None else None

        journal_node = article_node.find('.//Journal')
        journal_issue_node = journal_node.find(".//JournalIssue")
        journal_title_node = journal_node.find(".//Title")
        volume_node = journal_issue_node.find(".//Volume")
        issue_node = journal_issue_node.find(".//Issue")
        pubdate_node = journal_issue_node.find(".//PubDate")
        year_node = pubdate_node.find(".//Year")

        article_title_node = medline_citation_node.find(".//ArticleTitle")
        pagination_node = medline_citation_node.find('.//Pagination/MedlinePgn')
        abstract_node = medline_citation_node.find(".//Abstract")
        author_list_node = medline_citation_node.find('.//AuthorList')

        PMID = ""
        title = ""
        journal = ""
        medium = ""
        year = ""
        month = ""
        day = ""
        volume = ""
        issue = ""
        pages = ""           
        date_completed = ""
        date_revised = ""
        article_date = ""
        pub_date = ""

        if PMID_node is not None:
            PMID = PMID_node.text
        logger.debug(f"Processing article PMID: {PMID}")
        if article_title_node is not None:
            title = ''.join(article_title_node.itertext())
        if journal_title_node is not None:
            journal = journal_title_node.text
        if journal_issue_node is not None:
            medium = journal_issue_node.attrib['CitedMedium']
        if year_node is not None:
            year = year_node.text
        if volume_node is not None:
            volume = volume_node.text
        if issue_node is not None:
            issue = issue_node.text
        if pagination_node is not None:
            pages = pagination_node.text
        date_completed = cls._get_date_from_node(date_completed_node)
        date_revised = cls._get_date_from_node(date_revised_node)
        article_date = cls._get_date_from_node(article_date_node)
        # Get pub_date from year/month/day already extracted
        if year:
            pub_date = year
            if pubdate_node is not None:
                month_node = pubdate_node.find(".//Month")
                day_node = pubdate_node.find(".//Day")
                if month_node is not None:
                    month = month_node.text
                    pub_date += f"-{month.zfill(2)}"
                    if day_node is not None:
                        day = day_node.text
                        pub_date += f"-{day.zfill(2)}"
                else:
                    pub_date += "-01-01"  # Default to Jan 1 if no month

        MAX_AUTHOR_COUNT = 3
        author_list = []
        author_node_list = []
        if author_list_node is not None:
            author_node_list = author_list_node.findall('.//Author')
        for author_node in author_node_list[0:3]:
            last_name_node = author_node.find('.//LastName')
            if  last_name_node is not None:
                last_name = last_name_node.text
                initials_node = author_node.find('.//Initials')
                if initials_node is not None:
                    initials = initials_node.text
                else:
                    initials = ""
                author_list.append(f"{last_name} {initials}")
        authors = ', '.join(author_list)
        if len(author_node_list) > MAX_AUTHOR_COUNT:
            authors += ', et al'

        abstract = ""
        if abstract_node is not None:
            abstract_texts = abstract_node.findall('.//AbstractText')
            if abstract_texts is not None and len(abstract_texts) > 0:
                for abstract_text in abstract_texts:
                    abstract += ''.join(abstract_text.itertext())

        citation = f"{authors} {title} {journal}. {year};{volume}({issue}):{pages}."

        return Article(
                    PMID=PMID,
                    comp_date=date_completed,
                    date_revised=date_revised,
                    article_date=article_date,
                    pub_date=pub_date,
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    journal=journal,
                    medium=medium,
                    year=year,
                    volume=volume,
                    issue=issue,
                    pages=pages
                    )

    def __init__(self, **kwargs: Any) -> None:
        #print(kwargs)
        self.PMID = kwargs['PMID']
        self.comp_date = kwargs['comp_date']
        self.date_revised = kwargs.get('date_revised', '')
        self.article_date = kwargs.get('article_date', '')
        self.pub_date = kwargs.get('pub_date', '')
        self.title = kwargs['title']
        self.abstract = kwargs['abstract']
        self.authors = kwargs['authors']
        self.journal = kwargs['journal']
        self.year = kwargs['year']
        self.volume = kwargs['volume']
        self.issue = kwargs['issue']
        self.pages = kwargs['pages']
        self.medium = kwargs['medium']

    def __str__(self) -> str:
        line = "===================================================\n"        
        res = "PMID: " + self.PMID + '\n' \
            + "Comp date: " + self.comp_date + '\n' \
            + "Title: " + self.title[0:80] + '\n' \
            + "Abstract: " + self.abstract[0:80] + '\n' \
            + "Authors: " + self.authors[0:80] + '\n' \
            + 'Journal: ' + self.journal[0:80] + '\n' \
            + 'Year: ' + self.year + '\n' \
            + 'Volume: ' + self.volume + '\n' \
            + 'Issue: ' + self.issue + '\n' \
            + 'Medium: ' + self.medium
        
        return line + res

    @staticmethod
    def _get_date_from_node(date_completed_node: Optional[ET.Element]) -> str:
        if date_completed_node is None:
            return ""
        year_node = date_completed_node.find(".//Year")
        month_node = date_completed_node.find(".//Month")
        day_node = date_completed_node.find(".//Day")
        year = year_node.text
        if month_node is not None:
            month = month_node.text
        else:
            month = "01"
        if day_node is not None:
            day = day_node.text
        else:
            day = "01"
        return year + "-" + month + "-" + day


def _get_date_clause(start_date: str, end_date: str, date_type: str = "publication") -> str:
    """Build PubMed date filter clause based on date type."""
    # Map date types to PubMed search field tags
    date_field_map = {
        "completion": "Date - Completion",
        "publication": "Date - Publication", 
        "entry": "Date - Entry",
        "revised": "Date - Last Revision"
    }
    
    field = date_field_map.get(date_type, "Date - Publication")
    clause = f'AND (("{start_date}"[{field}] : "{end_date}"[{field}]))'
    return clause


def get_article_ids(search_term: str, max_results: int = 100) -> List[str]:
    """
    Basic PubMed search without date restrictions.
    
    Args:
        search_term: Search query string
        max_results: Maximum number of results to return
        
    Returns:
        List of article IDs
        
    Raises:
        Exception: If API call fails or returns non-200 status
    """
    url = PUBMED_API_SEARCH_URL
    params = {
        'db': 'pubmed',
        'term': search_term,
        'retmax': min(max_results, int(RETMAX)),
        'retmode': 'json'
    }
    
    headers = {
        'User-Agent': 'JamBot/1.0 (Research Assistant; Contact: admin@example.com)'
    }
    
    # Add NCBI API key if available (increases rate limit from 3 to 10 requests/second)
    ncbi_api_key = os.getenv('NCBI_API_KEY')
    if ncbi_api_key:
        params['api_key'] = ncbi_api_key
        logger.info("Using NCBI API key for increased rate limits")
    
    logger.info(f'Retrieving article IDs for query: {search_term}')
    logger.debug(f'Parameters: {params}')
    
    # Retry logic with exponential backoff
    max_retries = 3
    retry_delay = 1  # Start with 1 second delay
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params, headers=headers, timeout=30)
            break  # Success, exit retry loop
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                logger.warning(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Request failed after {max_retries} attempts: {e}")
                raise
    
    try:
        response.raise_for_status()
        
        # Log the response headers and first part of content for debugging
        logger.debug(f"Response status: {response.status_code}")
        logger.debug(f"Response headers: {response.headers}")
        
        # Check if we got JSON response
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            logger.error(f"Expected JSON but got content-type: {content_type}")
            logger.error(f"Response text (first 500 chars): {response.text[:500] if response.text else 'Empty response'}")
            raise Exception(f"PubMed API returned non-JSON response. Content-Type: {content_type}")
        
        # Check if response body is empty
        if not response.text:
            logger.error("PubMed API returned empty response body")
            raise Exception("PubMed API returned empty response")
        
        content = response.json()
        
        if 'esearchresult' not in content:
            raise Exception("Invalid response format from PubMed API")
            
        count = content['esearchresult']['count']
        ids = content['esearchresult']['idlist']
        
        logger.info(f"Found {count} articles, returning {len(ids)} IDs")
        return ids
        
    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP error in PubMed search: {e}", exc_info=True)
        raise Exception(f"PubMed API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error in PubMed search: {e}", exc_info=True)
        raise


def get_article_ids_by_date_range(filter_term: str, start_date: str, end_date: str, date_type: str = "publication") -> List[str]:
    """
    Retrieve PubMed article IDs within a specified date range.
    
    Args:
        filter_term: Search query string
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        date_type: Type of date to filter on ("publication", "completion", "entry", "revised")
        
    Returns:
        List of article IDs
        
    Raises:
        Exception: If API call fails or returns non-200 status
    """
    url = PUBMED_API_SEARCH_URL
    params = {
        'db': 'pubmed',
        'term': '(' + filter_term + ')' + _get_date_clause(start_date, end_date, date_type),
        'retmax': RETMAX,
        'retmode': 'json'
    }
    
    headers = {
        'User-Agent': 'JamBot/1.0 (Research Assistant; Contact: admin@example.com)'
    }
    
    # Add NCBI API key if available
    ncbi_api_key = os.getenv('NCBI_API_KEY')
    if ncbi_api_key:
        params['api_key'] = ncbi_api_key
        logger.info("Using NCBI API key for increased rate limits")
    
    logger.info('Retrieving article IDs by date range')
    logger.debug(f'Parameters: {params}')
    
    # Retry logic with exponential backoff
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params, headers=headers, timeout=30)
            break
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                logger.warning(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                logger.error(f"Request failed after {max_retries} attempts: {e}")
                raise
    
    try:
        response.raise_for_status()
        
        # Check if we got JSON response
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            logger.error(f"Expected JSON but got content-type: {content_type}")
            logger.error(f"Response text (first 500 chars): {response.text[:500] if response.text else 'Empty response'}")
            raise Exception(f"PubMed API returned non-JSON response. Content-Type: {content_type}")
        
        # Check if response body is empty
        if not response.text:
            logger.error("PubMed API returned empty response body")
            raise Exception("PubMed API returned empty response")
        
        content = response.json()
        
        if 'esearchresult' not in content:
            raise Exception("Invalid response format from PubMed API")
            
        count = content['esearchresult']['count']
        ids = content['esearchresult']['idlist']
        
        logger.info(f"Found {count} articles, returning {len(ids)} IDs")
        return ids
        
    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP error in PubMed date range search: {e}", exc_info=True)
        raise Exception(f"PubMed API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error in PubMed date range search: {e}", exc_info=True)
        raise


def get_articles_from_ids(ids: List[str]) -> List[Article]:
    articles = []
    batch_size = 100
    low = 0
    high = low + 100

    while low < len(ids):
        logger.info(f"Processing articles {low} to {high}")
        id_batch = ids[low: high]
        url = PUBMED_API_FETCH_URL
        params = {
            'db': 'pubmed',
            'id': ','.join(id_batch)
        }
        xml = ""
        try:
            response = requests.get(url, params)
            response.raise_for_status()
            xml = response.text
        except Exception as e:
            logger.error(f"Error fetching articles batch {low}-{high}: {e}", exc_info=True)
            continue  # Continue with next batch instead of silent failure

        root = ET.fromstring(xml)
        for article_node in root.findall(".//PubmedArticle"):
            articles.append(Article.from_xml(ET.tostring(article_node)))

        low += batch_size
        high += batch_size

    return articles


def get_citation_from_article(article: Article) -> str:
    authors = article.authors
    title = article.title
    journal = article.journal
    year = article.year
    volume = article.volume
    issue = article.issue
    pages = article.pages
    return f"{authors} ({year}). {title}. {journal}, {volume}({issue}), {pages}."


def search_articles_by_date_range(filter_term: str, start_date: str, end_date: str, date_type: str = "publication") -> List['CanonicalPubMedArticle']:
    """
    Search for PubMed articles within a specified date range and return canonical articles.
    
    Args:
        filter_term: Search query string
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        date_type: Type of date to filter on ("publication", "completion", "entry", "revised")
        
    Returns:
        List of CanonicalPubMedArticle objects
        
    Raises:
        Exception: If API calls fail or data processing fails
    """
    from schemas.canonical_types import CanonicalPubMedArticle
    
    logger.info(f"Searching PubMed articles: term='{filter_term}', dates={start_date} to {end_date}, date_type={date_type}")
    
    # Get article IDs - function now throws exception on error
    article_ids = get_article_ids_by_date_range(filter_term, start_date, end_date, date_type)
    logger.info(f"Found {len(article_ids)} article IDs")
    
    if not article_ids:
        return []
    
    # Get full article data
    logger.info(f"Fetching full article data for {len(article_ids)} articles")
    articles = get_articles_from_ids(article_ids)
    logger.info(f"Successfully retrieved {len(articles)} articles")
    
    # Convert to canonical format
    canonical_articles = []
    for article in articles:
        try:
            canonical_article = CanonicalPubMedArticle(
                pmid=article.PMID,
                title=article.title,
                abstract=article.abstract,
                authors=article.authors.split(', ') if article.authors else [],
                journal=article.journal,
                publication_date=f"{article.year}" if article.year else None,
                keywords=[],  # Would need to extract from XML
                mesh_terms=[],  # Would need to extract from XML
                metadata={
                    "volume": article.volume,
                    "issue": article.issue,
                    "pages": article.pages,
                    "medium": article.medium,
                    "comp_date": article.comp_date,
                    "date_revised": article.date_revised,
                    "article_date": article.article_date,
                    "pub_date": article.pub_date
                }
            )
            canonical_articles.append(canonical_article)
        except Exception as e:
            logger.warning(f"Failed to convert article {article.PMID} to canonical format: {e}")
            continue
    
    logger.info(f"Successfully converted {len(canonical_articles)} articles to canonical format")
    return canonical_articles 