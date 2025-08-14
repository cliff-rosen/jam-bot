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
from schemas.chat import ChatMessage, MessageRole

logger = logging.getLogger(__name__)


class SmartSearchService:
    """Service for smart search functionality"""
    
    def __init__(self):
        self.google_scholar_service = GoogleScholarService()
        
    async def refine_research_question(self, query: str) -> str:
        """
        Step 2: Refine/improve the user's research question using LLM
        """
        logger.info(f"Step 2 - Refining query: {query[:100]}...")
        
        # Create prompt for research question refinement
        system_prompt = """You are a research question refinement expert. Your task is to take a user's research question and make it more specific, clear, and searchable.

Guidelines:
- Make the question more specific and focused
- Clarify any ambiguous terms
- Add relevant context if needed
- Keep it as a natural question or statement
- Do NOT generate keywords yet (that's a separate step)

Respond in JSON format with the refined question in the "refined_query" field."""

        # Object schema with refined_query field for BasePromptCaller
        response_schema = {
            "type": "object",
            "properties": {
                "refined_query": {"type": "string"}
            },
            "required": ["refined_query"]
        }
        
        prompt_caller = BasePromptCaller(
            response_model=response_schema,
            system_message=system_prompt
        )
        
        try:
            # Get LLM response  
            user_message = ChatMessage(
                id="temp_id",
                chat_id="temp_chat", 
                role=MessageRole.USER,
                content=f"Original research question: {query}\n\nPlease provide a more specific and searchable version of this question.",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message]
            )
            
            # DEBUG: Log what we actually got back
            logger.info(f"LLM result type: {type(result)}")
            logger.info(f"LLM result: {result}")
            
            # Extract refined_query from the Pydantic model instance
            if hasattr(result, 'refined_query'):
                refined_query = result.refined_query
                logger.info(f"Successfully extracted refined_query: {refined_query}")
            else:
                logger.error(f"Result does not have 'refined_query' attribute. Type: {type(result)}, value: {result}")
                # Try model_dump as fallback
                if hasattr(result, 'model_dump'):
                    response_data = result.model_dump()
                    logger.info(f"model_dump fallback: {response_data}")
                    refined_query = response_data.get('refined_query', query)
                else:
                    refined_query = query  # Final fallback
                
            logger.info(f"Final refined query: {refined_query[:100]}...")
            return refined_query
            
        except Exception as e:
            logger.error(f"Failed to refine query: {e}")
            # Fallback: return original query
            return query
    
    async def generate_search_query(self, refined_query: str) -> str:
        """
        Step 3: Generate boolean search query from the REFINED query using LLM
        """
        logger.info(f"Step 3 - Generating boolean search query from refined query...")
        
        # Create prompt for search query generation
        system_prompt = """You are a search query expert for academic databases like PubMed and Google Scholar. Your task is to convert a research question into an effective boolean search query.

Guidelines:
- Use AND, OR, NOT operators appropriately
- Use parentheses to group related terms
- Include relevant medical/scientific terminology
- Include variations and synonyms with OR
- Use quotes for exact phrases when appropriate
- Structure for maximum recall while maintaining precision

Example formats:
- (cancer OR carcinoma) AND (treatment OR therapy) AND CRISPR
- "gene editing" AND (outcomes OR results) AND (clinical OR trials)
- (diabetes OR "diabetes mellitus") AND (insulin OR medication) NOT "type 1"

Respond in JSON format with a "search_query" field containing the boolean search string."""

        user_prompt = f"""Research question: {refined_query}

Generate an effective boolean search query for academic databases."""

        # Schema for search query
        response_schema = {
            "type": "object",
            "properties": {
                "search_query": {"type": "string"}
            },
            "required": ["search_query"]
        }
        
        prompt_caller = BasePromptCaller(
            response_model=response_schema,
            system_message=system_prompt
        )
        
        try:
            # Get LLM response
            user_message = ChatMessage(
                id="temp_id",
                chat_id="temp_chat", 
                role=MessageRole.USER,
                content=f"Research question: {refined_query}\n\nGenerate an effective boolean search query for academic databases.",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message]
            )
            
            # Extract search_query from the Pydantic model instance
            if hasattr(result, 'search_query'):
                search_query = result.search_query
                logger.info(f"Successfully extracted search_query: {search_query}")
            else:
                logger.error(f"Result does not have 'search_query' attribute. Type: {type(result)}, value: {result}")
                # Try model_dump as fallback
                if hasattr(result, 'model_dump'):
                    response_data = result.model_dump()
                    logger.info(f"model_dump fallback: {response_data}")
                    search_query = response_data.get('search_query', refined_query)
                else:
                    search_query = refined_query  # Final fallback
            
            logger.info(f"Generated search query: {search_query}")
            return search_query
            
        except Exception as e:
            logger.error(f"Failed to generate search query: {e}")
            # Fallback: use refined query as-is
            return refined_query
    
    
    async def search_articles(self, search_query: str, max_results: int = 50) -> SearchResultsResponse:
        """
        Search for articles using search query across multiple sources
        """
        logger.info(f"Searching with query: {search_query}")
        
        all_articles = []
        sources_searched = []
        
        # Search PubMed
        try:
            logger.info("Searching PubMed...")
            # Use search_pubmed function from pubmed_service (it's a sync function)
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            pubmed_articles, _ = await loop.run_in_executor(
                None, 
                search_pubmed,
                search_query,
                max_results // 2  # Split results between sources
            )
            
            for article in pubmed_articles:
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
            logger.info(f"Found {len(pubmed_articles)} PubMed articles")
            
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
                    title=article.title if article.title else "",
                    abstract=article.snippet if article.snippet else "",  # Scholar uses 'snippet' for abstract
                    authors=article.authors if article.authors else [],
                    year=article.year if article.year else 0,
                    journal=article.venue if hasattr(article, 'venue') else None,
                    doi=None,  # Scholar doesn't always provide DOI
                    pmid=None,
                    url=article.link if article.link else None,
                    source="google_scholar"
                ))
            sources_searched.append("google_scholar")
            logger.info(f"Found {len(scholar_articles)} Google Scholar articles")
            
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
        search_query: str,
        strictness: str = "medium"
    ) -> str:
        """
        Step 5: Generate a semantic discriminator prompt for filtering articles
        This creates the evaluation criteria that will be used to filter each article
        """
        logger.info(f"Step 5 - Generating semantic discriminator with strictness: {strictness}")
        
        strictness_instructions = {
            "low": "Be inclusive - accept articles that are somewhat related to the research question.",
            "medium": "Be balanced - accept articles that clearly relate to the research question.",
            "high": "Be strict - only accept articles that directly address the research question."
        }
        
        discriminator_prompt = f"""You are evaluating whether a research article matches a specific research question.

Research Question: {refined_query}

Search Query Used: {search_query}

Evaluation Strictness: {strictness.upper()}
{strictness_instructions.get(strictness, strictness_instructions["medium"])}

Your task: For each article provided, determine if it should be included in the search results.

Evaluation Criteria:
1. Does the article address the core topic of the research question?
2. Are the key terms present and used in a relevant context (not just mentioned in passing)?
3. Would this article provide meaningful information for answering the research question?
4. Is the article's focus aligned with the intent of the query?

For {strictness} strictness:
{"- Accept if 2 or more criteria are met" if strictness == "low" else ""}
{"- Accept if 3 or more criteria are met" if strictness == "medium" else ""}
{"- Accept only if ALL 4 criteria are met" if strictness == "high" else ""}

You must respond in this exact JSON format:
{{
    "decision": "Yes" or "No",
    "confidence": 0.0 to 1.0,
    "reasoning": "1-2 sentence explanation of your decision"
}}"""
        
        return discriminator_prompt
    
    async def filter_articles_streaming(
        self,
        articles: List[SearchArticle],
        refined_query: str,
        search_query: str,
        strictness: str = "medium"
    ) -> AsyncGenerator[str, None]:
        """
        Filter articles using semantic discriminator with streaming updates
        """
        logger.info(f"Starting filtering of {len(articles)} articles")
        
        # Generate discriminator prompt
        discriminator = await self.generate_semantic_discriminator(
            refined_query, search_query, strictness
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
            user_message = ChatMessage(
                id="temp_id",
                chat_id="temp_chat", 
                role=MessageRole.USER,
                content=eval_prompt,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message]
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