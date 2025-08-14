"""
Smart Search Service

Service for intelligent research article search with LLM-powered refinement and filtering.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, AsyncGenerator
from datetime import datetime

from schemas.smart_search import (
    SmartSearchRefinementResponse,
    SearchArticle,
    SearchResultsResponse,
    FilteredArticle,
    FilteringProgress
)
from services.google_scholar_service import GoogleScholarService
from services.pubmed_service import search_pubmed
from agents.prompts.base_prompt_caller import BasePromptCaller

logger = logging.getLogger(__name__)


class SmartSearchService:
    """Service for smart search functionality"""
    
    def __init__(self):
        self.google_scholar_service = GoogleScholarService()
        
    async def refine_search_query(self, query: str) -> SmartSearchRefinementResponse:
        """
        Refine user query and extract search keywords using LLM
        """
        logger.info(f"Refining query: {query[:100]}...")
        
        # Create prompt for query refinement
        system_prompt = """You are a research query refinement expert. Your task is to:
1. Make research queries more specific and searchable
2. Extract effective search keywords
3. Suggest a search strategy

Respond in JSON format with these fields:
- refined_query: A more specific, searchable version of the query
- keywords: Array of 5-10 search keywords/phrases
- search_strategy: Brief explanation of the search approach (1-2 sentences)"""

        user_prompt = f"""Original research query: {query}

Please refine this query to be more specific and generate search keywords."""

        # Create prompt caller for structured response
        response_schema = {
            "type": "object",
            "properties": {
                "refined_query": {"type": "string"},
                "keywords": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "search_strategy": {"type": "string"}
            },
            "required": ["refined_query", "keywords", "search_strategy"]
        }
        
        prompt_caller = BasePromptCaller(
            response_model=response_schema,
            system_message=system_prompt
        )
        
        try:
            # Get LLM response
            result = await prompt_caller.invoke(
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            # Convert to response model
            response_data = result.model_dump() if hasattr(result, 'model_dump') else dict(result)
            
            return SmartSearchRefinementResponse(
                original_query=query,
                refined_query=response_data.get("refined_query", query),
                keywords=response_data.get("keywords", []),
                search_strategy=response_data.get("search_strategy", "Standard keyword search")
            )
            
        except Exception as e:
            logger.error(f"Failed to refine query: {e}")
            # Fallback response
            return SmartSearchRefinementResponse(
                original_query=query,
                refined_query=query,
                keywords=query.split()[:5],  # Simple keyword extraction
                search_strategy="Fallback: Using original query terms"
            )
    
    async def search_articles(self, keywords: List[str], max_results: int = 50) -> SearchResultsResponse:
        """
        Search for articles using keywords across multiple sources
        """
        logger.info(f"Searching with keywords: {keywords}")
        
        all_articles = []
        sources_searched = []
        
        # Create search query from keywords
        search_query = " ".join(keywords)
        
        # Search PubMed
        try:
            logger.info("Searching PubMed...")
            # Use search_pubmed function from pubmed_service (it's a sync function)
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            pubmed_results = await loop.run_in_executor(
                None, 
                search_pubmed,
                search_query,
                max_results // 2  # Split results between sources
            )
            
            for article in pubmed_results:
                all_articles.append(SearchArticle(
                    title=article.title,
                    abstract=article.abstract if article.abstract else "",
                    authors=article.authors if article.authors else [],
                    year=article.year if article.year else 0,
                    journal=article.journal if hasattr(article, 'journal') else None,
                    doi=article.doi if hasattr(article, 'doi') else None,
                    pmid=article.pmid,
                    url=f"https://pubmed.ncbi.nlm.nih.gov/{article.pmid}/" if article.pmid else None,
                    source="pubmed"
                ))
            sources_searched.append("pubmed")
            logger.info(f"Found {len(pubmed_results)} PubMed articles")
            
        except Exception as e:
            logger.error(f"PubMed search failed: {e}")
        
        # Search Google Scholar
        try:
            logger.info("Searching Google Scholar...")
            # Google Scholar service is also sync, run in executor
            loop = asyncio.get_event_loop()
            scholar_articles, _ = await loop.run_in_executor(
                None,
                self.google_scholar_service.search_articles,
                search_query,
                max_results // 2
            )
            
            for article in scholar_articles:
                all_articles.append(SearchArticle(
                    title=article.get("title", ""),
                    abstract=article.get("snippet", ""),  # Scholar uses 'snippet' for abstract
                    authors=article.get("authors", "").split(", ") if article.get("authors") else [],
                    year=article.get("year", 0),
                    journal=article.get("venue"),
                    doi=None,  # Scholar doesn't always provide DOI
                    pmid=None,
                    url=article.get("link"),
                    source="google_scholar"
                ))
            sources_searched.append("google_scholar")
            logger.info(f"Found {len(scholar_results)} Google Scholar articles")
            
        except Exception as e:
            logger.error(f"Google Scholar search failed: {e}")
        
        return SearchResultsResponse(
            articles=all_articles,
            total_found=len(all_articles),
            sources_searched=sources_searched
        )
    
    async def generate_semantic_discriminator(
        self, 
        refined_query: str, 
        keywords: List[str],
        strictness: str = "medium"
    ) -> str:
        """
        Generate a semantic discriminator prompt for filtering articles
        """
        logger.info(f"Generating discriminator with strictness: {strictness}")
        
        strictness_instructions = {
            "low": "Be inclusive - accept articles that are somewhat related to the research question.",
            "medium": "Be balanced - accept articles that clearly relate to the research question.",
            "high": "Be strict - only accept articles that directly address the research question."
        }
        
        discriminator_prompt = f"""Research Question: {refined_query}
Key Terms: {', '.join(keywords)}

Evaluation Criteria ({strictness}):
{strictness_instructions.get(strictness, strictness_instructions["medium"])}

For the following article, determine if it matches the research question.
Consider:
1. Does the article address the core research topic?
2. Are the key terms present and used in relevant context?
3. Would this article provide useful information for answering the research question?

Respond with:
- Decision: "Yes" or "No"
- Confidence: 0.0 to 1.0
- Reasoning: Brief explanation (1-2 sentences)
"""
        
        return discriminator_prompt
    
    async def filter_articles_streaming(
        self,
        articles: List[SearchArticle],
        refined_query: str,
        keywords: List[str],
        strictness: str = "medium"
    ) -> AsyncGenerator[str, None]:
        """
        Filter articles using semantic discriminator with streaming updates
        """
        logger.info(f"Starting filtering of {len(articles)} articles")
        
        # Generate discriminator prompt
        discriminator = await self.generate_semantic_discriminator(
            refined_query, keywords, strictness
        )
        
        # Initialize counters
        total = len(articles)
        processed = 0
        accepted = 0
        rejected = 0
        
        # Send initial progress
        progress = FilteringProgress(
            total=total,
            processed=0,
            accepted=0,
            rejected=0
        )
        yield f"data: {json.dumps({'type': 'progress', 'data': progress.dict(), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        # Process each article
        for article in articles:
            try:
                # Update current article
                progress.current_article = article.title[:100]
                yield f"data: {json.dumps({'type': 'status', 'message': f'Evaluating: {article.title[:100]}...', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # Evaluate article
                result = await self._evaluate_article(article, discriminator)
                
                # Update counters
                processed += 1
                if result.passed:
                    accepted += 1
                else:
                    rejected += 1
                
                # Send filtered article result
                yield f"data: {json.dumps({'type': 'article', 'data': result.dict(), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # Send progress update
                progress = FilteringProgress(
                    total=total,
                    processed=processed,
                    accepted=accepted,
                    rejected=rejected,
                    current_article=article.title[:100]
                )
                yield f"data: {json.dumps({'type': 'progress', 'data': progress.dict(), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
                # Small delay to prevent overwhelming
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error filtering article '{article.title}': {e}")
                # Send error but continue
                yield f"data: {json.dumps({'type': 'error', 'message': f'Error filtering article: {str(e)}', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        # Send completion message
        yield f"data: {json.dumps({'type': 'complete', 'data': {'total_processed': processed, 'accepted': accepted, 'rejected': rejected}, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        logger.info(f"Filtering complete: {accepted}/{total} articles accepted")
    
    async def _evaluate_article(self, article: SearchArticle, discriminator: str) -> FilteredArticle:
        """
        Evaluate a single article against the discriminator
        """
        # Prepare article text for evaluation
        article_text = f"""Title: {article.title}
Abstract: {article.abstract or "No abstract available"}"""
        
        # Create evaluation prompt
        eval_prompt = f"""{discriminator}

Article to evaluate:
{article_text}

Respond in JSON format:
{{
    "decision": "Yes" or "No",
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation"
}}"""
        
        # Create prompt caller for structured response
        response_schema = {
            "type": "object",
            "properties": {
                "decision": {"type": "string", "enum": ["Yes", "No"]},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "reasoning": {"type": "string"}
            },
            "required": ["decision", "confidence", "reasoning"]
        }
        
        prompt_caller = BasePromptCaller(
            response_model=response_schema,
            system_message="You are a research article evaluator. Evaluate articles based on the given criteria."
        )
        
        try:
            # Get LLM evaluation
            result = await prompt_caller.invoke(
                messages=[{"role": "user", "content": eval_prompt}]
            )
            
            # Convert to response model
            eval_data = result.model_dump() if hasattr(result, 'model_dump') else dict(result)
            
            return FilteredArticle(
                article=article,
                passed=eval_data.get("decision", "No") == "Yes",
                confidence=eval_data.get("confidence", 0.5),
                reasoning=eval_data.get("reasoning", "No reasoning provided")
            )
            
        except Exception as e:
            logger.error(f"Failed to evaluate article: {e}")
            # Default to not passing with low confidence
            return FilteredArticle(
                article=article,
                passed=False,
                confidence=0.0,
                reasoning=f"Evaluation failed: {str(e)}"
            )