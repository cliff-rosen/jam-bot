"""
Smart Search Service

Service for intelligent research article search with LLM-powered refinement and filtering.
"""

import json
import logging
import asyncio
import re
from typing import List, Dict, Any, AsyncGenerator, Tuple, Union, Optional, Set
from datetime import datetime

from schemas.features import FeatureDefinition
from schemas.smart_search import (
    SearchArticle,
    SearchPaginationInfo,
    FilteredArticle,
    FilteringProgress,
    SearchServiceResult,
    OptimizedQueryResult
)
from schemas.chat import ChatMessage, MessageRole

from agents.prompts.base_prompt_caller import BasePromptCaller, LLMUsage

from services.google_scholar_service import GoogleScholarService
from services.pubmed_service import search_pubmed

logger = logging.getLogger(__name__)


class SmartSearchService:
    """Service for smart search functionality"""
    
    def __init__(self):
        self.google_scholar_service = GoogleScholarService()
    
    def _extract_pmid_from_url(self, url: str) -> Optional[str]:
        """Extract PMID from a URL if present."""
        if not url:
            return None
        # Match patterns like pubmed/12345678 or pmid=12345678
        pmid_patterns = [
            r'pubmed[./](\d+)',
            r'pmid[=:](\d+)',
            r'articles/PMC\d+.*PMID[:\s]+(\d+)'
        ]
        for pattern in pmid_patterns:
            match = re.search(pattern, url, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    async def create_evidence_specification(self, query: str) -> Tuple[str, LLMUsage]:
        """
        Step 2: Create evidence specification from user's query using LLM
        """
        logger.info(f"Step 2 - Creating evidence specification from: {query[:100]}...")
        
        # Create prompt for evidence specification
        system_prompt = """Convert the user's search request into a clear document specification.

RULES:
1. Always start with "Find articles that..."
2. Keep it simple and direct
3. Focus on what documents are needed, not research questions
4. Use the user's own terms when possible

EXAMPLES:
"effects of exercise on health" → "Find articles that examine the health effects of physical exercise"
"How does AI help doctors?" → "Find articles that discuss AI applications in clinical practice"  
"cannabis and motivation" → "Find articles that examine cannabis effects on motivation"

Respond in JSON format with the "evidence_specification" field."""

        # Object schema with refined_query field for BasePromptCaller
        response_schema = {
            "type": "object",
            "properties": {
                "evidence_specification": {"type": "string"}
            },
            "required": ["evidence_specification"]
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
                content=f"User query: {query}\n\nPlease create an evidence specification that describes what documents are needed.",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message],
                return_usage=True
            )
            
            # DEBUG: Log what we actually got back
            logger.info(f"LLM result type: {type(result)}")
            logger.info(f"LLM result: {result}")
            
            # Extract result and usage from LLMResponse
            llm_usage = result.usage
            llm_result = result.result
            
            # Extract evidence_specification from the Pydantic model instance
            if hasattr(llm_result, 'evidence_specification'):
                evidence_spec = llm_result.evidence_specification
                logger.info(f"Successfully extracted evidence_specification: {evidence_spec}")
            else:
                logger.error(f"Result does not have 'evidence_specification' attribute. Type: {type(llm_result)}, value: {llm_result}")
                # Try model_dump as fallback
                if hasattr(llm_result, 'model_dump'):
                    response_data = llm_result.model_dump()
                    logger.info(f"model_dump fallback: {response_data}")
                    evidence_spec = response_data.get('evidence_specification', f"Find articles that {query}")
                else:
                    evidence_spec = f"Find articles that {query}"  # Final fallback
                
            logger.info(f"Final evidence specification: {evidence_spec[:100]}...")
            logger.info(f"Token usage - Prompt: {llm_usage.prompt_tokens}, Completion: {llm_usage.completion_tokens}, Total: {llm_usage.total_tokens}")
            return evidence_spec, llm_usage
            
        except Exception as e:
            logger.error(f"Failed to refine query: {e}")
            # Fallback: return evidence specification format with zero usage
            return f"Find articles that {query}", LLMUsage()
    
    async def generate_search_keywords(self, evidence_specification: str, selected_sources: Optional[List[str]] = None) -> Tuple[str, LLMUsage]:
        """
        Step 3: Generate boolean search query from the evidence specification using LLM
        """
        logger.info(f"Step 3 - Generating search keywords from evidence specification...")
        
        # Determine the target source
        target_source = selected_sources[0] if selected_sources else 'pubmed'
        
        # Create source-specific prompts
        if target_source == 'google_scholar':
            system_prompt = """You are a search query expert for Google Scholar. Your task is to convert an evidence specification into a SIMPLE and FOCUSED natural language search query.

CRITICAL REQUIREMENTS:
- MAXIMUM 3-5 key terms only
- NO complex boolean logic with AND/OR
- NO parentheses or nested expressions
- Use simple quoted phrases for specific concepts
- Target 200-2000 results, not millions

APPROACH:
1. Identify the 1-2 MOST IMPORTANT concepts
2. Use the most specific terms possible
3. Add one quoted phrase for the main topic
4. Keep it short and focused

GOOD EXAMPLES:
- "CRISPR gene editing" cancer
- "machine learning" medical diagnosis
- "quantum computing" algorithms
- "climate change adaptation" agriculture
- "materials science" nanomaterials synthesis

BAD EXAMPLES (too broad/complex):
- ("China" OR "Chinese") AND ("materials science" OR materials) AND (synthesis OR characterization)
- (diabetes OR diabetic) AND (treatment OR therapy)
- machine learning OR artificial intelligence OR deep learning

STRICT RULE: If the evidence specification is very broad, make the query MORE specific, not less. Focus on the core scientific question.

Respond in JSON format with a "search_query" field containing the simple natural language search string."""
        else:
            # PubMed prompt (original)
            system_prompt = """You are a search query expert for PubMed and biomedical databases. Your task is to convert an evidence specification into an EFFECTIVE boolean search query optimized for PubMed.

PUBMED CHARACTERISTICS:
- Searches titles, abstracts, and MeSH terms
- Excellent boolean operator support
- Structured indexing system
- Precise field searching capabilities
- Works best with controlled vocabulary

CORE PRINCIPLES:
- Target 500-2000 relevant results (not too broad, not too narrow)
- Use precise biomedical terminology
- Leverage boolean logic effectively
- Focus on the most important 2-3 concepts

GUIDELINES:
1. Identify the 2-3 CORE concepts from the evidence specification
2. For each concept, use 2-4 of the most common medical synonyms/variants
3. Use AND to connect different concepts
4. Use OR only for true synonyms within the same concept
5. Use biomedical terminology that appears in PubMed abstracts
6. Include MeSH terms and common abbreviations when relevant

QUERY STRUCTURE:
- Boolean format: (concept1 OR synonym1) AND (concept2 OR synonym2)
- Maximum 3 AND-connected concept groups
- 2-4 terms per OR group
- Clear parentheses for grouping

GOOD EXAMPLES:
- (diabetes OR diabetic) AND (neuropathy OR "nerve damage") AND (treatment OR therapy)
- (CRISPR OR "gene editing") AND (cancer OR tumor OR neoplasm)
- (myocardial OR cardiac) AND (infarction OR "heart attack") AND (prevention OR prophylaxis)

BAD EXAMPLES (too complex):
- (diabetes OR diabetic OR glycemic OR "blood sugar" OR hyperglycemia) AND (neuropathy OR "nerve damage" OR "peripheral nerve" OR polyneuropathy) AND (treatment OR therapy OR management OR intervention OR medication)

Respond in JSON format with a "search_query" field containing the boolean search string."""

        user_prompt = f"""Evidence specification: {evidence_specification}

Generate an effective search query for {target_source.replace('_', ' ').title()}."""

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
                content=f"Evidence specification: {evidence_specification}\n\nGenerate an effective boolean search query for academic databases.",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message],
                return_usage=True
            )
            
            # Extract result and usage from LLMResponse
            llm_usage = result.usage
            llm_result = result.result
            
            # Extract search_query from the Pydantic model instance
            if hasattr(llm_result, 'search_query'):
                search_query = llm_result.search_query
                logger.info(f"Successfully extracted search_query: {search_query}")
            else:
                logger.error(f"Result does not have 'search_query' attribute. Type: {type(llm_result)}, value: {llm_result}")
                # Try model_dump as fallback
                if hasattr(llm_result, 'model_dump'):
                    response_data = llm_result.model_dump()
                    logger.info(f"model_dump fallback: {response_data}")
                    search_query = response_data.get('search_query', evidence_specification)
                else:
                    search_query = evidence_specification  # Final fallback
            
            logger.info(f"Generated search query: {search_query}")
            logger.info(f"Token usage - Prompt: {llm_usage.prompt_tokens}, Completion: {llm_usage.completion_tokens}, Total: {llm_usage.total_tokens}")
            return search_query, llm_usage
            
        except Exception as e:
            logger.error(f"Failed to generate search query: {e}")
            # Fallback: use evidence specification as-is with zero usage
            return evidence_specification, LLMUsage()
    
    async def get_search_count(self, search_query: str, selected_sources: Optional[List[str]] = None) -> Tuple[int, List[str]]:
        """
        Get total count of search results without retrieving articles
        """
        logger.info(f"Getting result count for query: {search_query[:100]}...")
        
        try:
            # Use the existing search method but with count_only mode
            search_response = await self.search_articles(
                search_query, 
                max_results=1, 
                offset=0, 
                count_only=True,
                selected_sources=selected_sources
            )
            return search_response.pagination.total_available, search_response.sources_searched
        except Exception as e:
            logger.error(f"Failed to get search count: {e}")
            return 0, []
    
    async def add_targeted_refinement(self, current_query: str, current_count: int, evidence_spec: str, target_max: int = 250, selected_sources: Optional[List[str]] = None) -> Tuple[str, str]:
        """
        Add a single targeted refinement to the current query to reduce volume
        with minimal Type II error risk - source-specific approach
        """
        logger.info(f"Adding targeted refinement to: {current_query[:100]}... (current: {current_count:,} → target: <{target_max})")
        
        # Determine target source
        target_source = selected_sources[0] if selected_sources else 'pubmed'
        
        # Source-specific refinement approaches
        if target_source == 'google_scholar':
            # Google Scholar: Use natural language additions
            system_prompt = """You are a Google Scholar search refinement expert. Your task is to add ONE specific term or quoted phrase to a natural language query to reduce results while maintaining relevance.

GOOGLE SCHOLAR REFINEMENT RULES:
1. Add ONE specific term that narrows the scope
2. Use quoted phrases for specific concepts: "randomized trial"
3. NO boolean operators (AND/OR) - just add words naturally
4. Focus on methodology, population, or time constraints
5. Keep the refined query natural and readable

GOOD REFINEMENT EXAMPLES:
- "machine learning healthcare" → "machine learning healthcare" "clinical trial"
- "climate change agriculture" → "climate change agriculture" adaptation
- "materials science nanomaterials" → "materials science nanomaterials" synthesis

EFFECTIVE REFINEMENT TERMS:
- Study design: "randomized trial", "systematic review", "meta-analysis"
- Setting: clinical, laboratory, hospital, community
- Population: pediatric, elderly, adult, adolescent
- Methodology: prospective, longitudinal, cross-sectional
- Time: recent, 2020-2024, "last decade"

Respond in JSON format with "refined_query" and "explanation" fields."""
        else:
            # PubMed: Use boolean AND refinement
            system_prompt = """You are a search query refinement expert for PubMed. Your task is to add ONE targeted AND clause to reduce search results to the target range while maintaining relevance.

CRITICAL REQUIREMENTS:
1. The current query returns too many results and MUST be reduced to the target range
2. Add ONE specific AND clause - NOT a broad OR clause with many alternatives
3. Choose the MOST RESTRICTIVE reasonable filter from the evidence specification that will not produce excessive type II errors
4. Prefer single terms or small 2-3 term OR groups, NOT large OR lists
5. Focus on the most specific, distinctive aspect that will actually filter results.

EFFECTIVE STRATEGIES (choose ONE):
- Study design: AND "randomized controlled trial" OR AND longitudinal OR AND "systematic review"
- Population: AND adolescent OR AND "young adult" OR AND "college student" 
- Setting: AND clinical OR AND laboratory OR AND workplace
- Outcome type: AND cognitive OR AND behavioral OR AND neuroimaging
- Timeframe: AND chronic OR AND acute OR AND "long-term"

BAD EXAMPLES (too broad, won't reduce results):
❌ AND (study OR research OR analysis OR investigation OR trial OR experiment)
❌ AND (human OR participant OR subject OR patient OR control OR experimental)
❌ AND (outcome OR result OR effect OR impact OR change OR difference)

GOOD EXAMPLES (specific, will actually filter):
✅ AND "randomized controlled trial"
✅ AND adolescent  
✅ AND cognitive
✅ AND (fMRI OR neuroimaging)

The goal is meaningful reduction in result count, not just adding more terms.

Respond in JSON format with the refined query and explanation."""

        # Source-specific user prompt
        if target_source == 'google_scholar':
            user_prompt = f"""Current Google Scholar query: {current_query}
Current result count: {current_count:,} results
Target: Under {target_max} results

Evidence specification: {evidence_spec}

Add ONE specific term or quoted phrase to this natural language query to reduce results while maintaining relevance. Focus on the most specific aspect that will filter results effectively."""
        else:
            user_prompt = f"""Current PubMed query: {current_query}
Current result count: {current_count:,} results
Target: Under {target_max} results

Evidence specification: {evidence_spec}

Add ONE conservative AND clause to reduce results while minimizing risk of excluding relevant articles. The current query returns {current_count:,} results, so we need to reduce this to under {target_max}."""

        # Schema for refinement response
        response_schema = {
            "type": "object",
            "properties": {
                "refined_query": {"type": "string"},
                "explanation": {"type": "string"}
            },
            "required": ["refined_query", "explanation"]
        }
        
        prompt_caller = BasePromptCaller(
            response_model=response_schema,
            system_message=system_prompt
        )
        
        try:
            # Get LLM refinement suggestion
            user_message = ChatMessage(
                id="temp_id",
                chat_id="temp_chat", 
                role=MessageRole.USER,
                content=user_prompt,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            result = await prompt_caller.invoke(
                messages=[user_message],
                return_usage=True
            )
            
            # Extract result
            llm_result = result.result
            
            # DEBUG: Log what we actually got back
            logger.info(f"LLM result type: {type(llm_result)}")
            logger.info(f"LLM result: {llm_result}")
            logger.info(f"LLM result attributes: {dir(llm_result) if hasattr(llm_result, '__dict__') else 'No attributes'}")
            
            if hasattr(llm_result, 'refined_query'):
                refined_query = llm_result.refined_query
                explanation = llm_result.explanation if hasattr(llm_result, 'explanation') else "LLM-generated refinement"
                logger.info(f"SUCCESS: Using direct attributes - refined_query: {refined_query}")
            else:
                logger.warning(f"LLM result does not have 'refined_query' attribute. Trying model_dump...")
                # Fallback to model_dump
                if hasattr(llm_result, 'model_dump'):
                    response_data = llm_result.model_dump()
                    logger.info(f"model_dump result: {response_data}")
                    # Source-specific fallback
                    if target_source == 'google_scholar':
                        default_refinement = f"{current_query} study"
                        default_explanation = "Added 'study' to focus on research (fallback refinement)"
                    else:
                        default_refinement = f"({current_query}) AND (study OR research)"
                        default_explanation = "Added research focus as fallback refinement"
                    refined_query = response_data.get('refined_query', default_refinement)
                    explanation = response_data.get('explanation', default_explanation)
                    logger.info(f"FALLBACK 1: Using model_dump - refined_query: {refined_query}")
                else:
                    logger.warning(f"LLM result has no model_dump method. Using hardcoded fallback.")
                    # Source-specific fallback
                    if target_source == 'google_scholar':
                        refined_query = f"{current_query} study"
                        explanation = "Added 'study' to focus on research (fallback refinement)"
                    else:
                        refined_query = f"({current_query}) AND (study OR research)"
                        explanation = "Added research focus as fallback refinement"
                    logger.info(f"FALLBACK 2: Using hardcoded fallback - refined_query: {refined_query}")
                
            logger.info(f"FINAL: LLM suggested refinement: {refined_query}")
            logger.info(f"FINAL: Explanation: {explanation}")
            return refined_query, explanation
            
        except Exception as e:
            logger.error(f"Failed to generate LLM refinement: {e}")
            # Source-specific conservative fallback
            if target_source == 'google_scholar':
                fallback_query = f"{current_query} study"
                return fallback_query, "Added 'study' to focus on research (exception fallback)"
            else:
                fallback_query = f"({current_query}) AND (study OR research OR analysis)"
                return fallback_query, "Added research focus (exception fallback)"
    
    async def generate_optimized_search_query(self, current_query: str, evidence_spec: str, target_max: int = 250, selected_sources: Optional[List[str]] = None) -> OptimizedQueryResult:
        """
        Generate an optimized search query by adding refinements to the current query
        Returns: (initial_query, initial_count, final_query, final_count, refinement_description, status)
        """
        logger.info(f"Optimizing current query: {current_query[:100]}...")
        
        # Phase 1: Get current query count
        initial_query = current_query
        initial_count, _ = await self.get_search_count(initial_query, selected_sources)
        
        logger.info(f"Current query has {initial_count} results")
        
        # Phase 2: Check if refinement is needed
        if initial_count <= target_max:
            return initial_query, initial_count, initial_query, initial_count, "Query already optimal", "optimal"
        
        # Phase 3: Add targeted refinement to current query
        final_query, refinement_description = await self.add_targeted_refinement(initial_query, initial_count, evidence_spec, target_max, selected_sources)
        final_count, _ = await self.get_search_count(final_query, selected_sources)
        
        # Determine status
        if final_count <= target_max and final_count > 0:
            status = "refined"
        elif final_count == 0:
            status = "manual_needed"
            refinement_description += " (Refinement too restrictive - no results found)"
        else:
            status = "manual_needed"
            refinement_description += f" (Still {final_count} results - manual refinement may be needed)"
        
        logger.info(f"Optimized query: {final_count} results, status: {status}")
        return OptimizedQueryResult(
            initial_query=initial_query,
            initial_count=initial_count,
            final_query=final_query,
            final_count=final_count,
            refinement_description=refinement_description,
            status=status
        )
      
    async def search_articles(self, search_query: str, max_results: int = 50, offset: int = 0, count_only: bool = False, selected_sources: Optional[List[str]] = None) -> SearchServiceResult:
        """
        Search for articles from a single selected source.
        """
        # Default to PubMed if not specified
        if not selected_sources:
            selected_sources = ['pubmed']
        
        # We now only support single source searches
        source = selected_sources[0]
        
        logger.info(f"Searching {source} - Query: {search_query[:100]}... (max_results={max_results}, offset={offset}, count_only={count_only})")
        
        if source == 'pubmed':
            return await self._search_pubmed(search_query, max_results, offset, count_only)
        elif source == 'google_scholar':
            return await self._search_google_scholar(search_query, max_results, offset, count_only)
        else:
            raise ValueError(f"Unsupported source: {source}")
    
    async def _search_pubmed(self, search_query: str, max_results: int, offset: int, count_only: bool) -> SearchServiceResult:
        """Search PubMed and return results."""
        try:
            loop = asyncio.get_event_loop()
            results_to_fetch = 1 if count_only else max_results
            
            pubmed_articles, metadata = await loop.run_in_executor(
                None, 
                search_pubmed,
                search_query,
                results_to_fetch,
                offset
            )
            
            total_available = metadata.get('total_results', 0)
            articles = []
            
            if not count_only:
                for article in pubmed_articles:
                    # Generate proper ID: pmid > doi > generated
                    pmid = article.id.replace("pubmed_", "") if article.id and article.id.startswith("pubmed_") else None
                    doi = article.doi
                    
                    if pmid:
                        article_id = f"pmid:{pmid}"
                    elif doi:
                        article_id = f"doi:{doi}"
                    else:
                        article_id = f"pubmed_{article.title[:50]}_{','.join(article.authors[:2]) if article.authors else ''}"
                    
                    articles.append(SearchArticle(
                        id=article_id,
                        title=article.title,
                        abstract=article.abstract or "",
                        authors=article.authors or [],
                        year=article.publication_year or 0,
                        journal=article.journal,
                        doi=doi,
                        pmid=pmid,
                        url=article.url,
                        source="pubmed"
                    ))
            
            logger.info(f"PubMed: {len(articles)} articles returned, {total_available} total available")
            
            return SearchServiceResult(
                articles=articles,
                pagination=SearchPaginationInfo(
                    total_available=total_available,
                    returned=len(articles),
                    offset=offset,
                    has_more=offset + len(articles) < total_available
                ),
                sources_searched=["pubmed"]
            )
            
        except Exception as e:
            logger.error(f"PubMed search failed: {e}")
            return SearchServiceResult(
                articles=[],
                pagination=SearchPaginationInfo(total_available=0, returned=0, offset=0, has_more=False),
                sources_searched=["pubmed"]
            )
    
    async def _search_google_scholar(self, search_query: str, max_results: int, offset: int, count_only: bool) -> SearchServiceResult:
        """Search Google Scholar and return results."""
        try:
            loop = asyncio.get_event_loop()
            results_to_fetch = 1 if count_only else max_results
            
            scholar_articles, metadata = await loop.run_in_executor(
                None,
                self.google_scholar_service.search_articles,
                search_query,
                results_to_fetch
            )
            
            total_available = metadata.get('total_results', 0)
            articles = []
            
            if not count_only:
                for article in scholar_articles:
                    # Now article is a GoogleScholarArticle instance with proper attributes
                    articles.append(SearchArticle(
                        id=article.id,  # Use the generated ID from GoogleScholarArticle
                        title=article.title or "",
                        abstract=article.snippet or "",  # GoogleScholarArticle uses 'snippet' for abstract
                        authors=article.authors or [],
                        year=article.year or 0,
                        journal=article.journal,  # GoogleScholarArticle extracts journal info
                        doi=article.doi,  # GoogleScholarArticle extracts DOI
                        pmid=self._extract_pmid_from_url(article.link) if article.link else None,
                        url=article.link,
                        source="google_scholar"
                    ))
            
            logger.info(f"Google Scholar: {len(articles)} articles returned, {total_available} total available")
            
            return SearchServiceResult(
                articles=articles,
                pagination=SearchPaginationInfo(
                    total_available=total_available,
                    returned=len(articles),
                    offset=offset,
                    has_more=offset + len(articles) < total_available
                ),
                sources_searched=["google_scholar"]
            )
            
        except Exception as e:
            logger.error(f"Google Scholar search failed: {e}")
            return SearchServiceResult(
                articles=[],
                pagination=SearchPaginationInfo(total_available=0, returned=0, offset=0, has_more=False),
                sources_searched=["google_scholar"]
            )
    
    async def generate_semantic_discriminator(
        self, 
        refined_question: str, 
        search_query: str,
        strictness: str = "medium"
    ) -> str:
        """
        Step 5: Generate a semantic discriminator prompt for filtering articles
        This creates the evaluation criteria that will be used to filter each article
        """
        logger.info(f"Step 5 - Generating semantic discriminator with strictness: {strictness}")
        
        discriminator_prompt = f"""You are evaluating whether a research article matches a specific research question. The article in question was retrieved as follows: First, the below Research Question was converting to keywords using LLM. Then these keywords were used to search for articles in the search query. As a result, not all results will actually be a correct semantic match to the research question. Your job is to determine if the article is a correct semantic match to the research question.

Research Question: {refined_question}

Search Query Used: {search_query}

You must respond in this exact JSON format:
{{
    "decision": "Yes" or "No",
    "confidence": 0.0 to 1.0,
    "reasoning": "1-2 sentence explanation of your decision"
}}"""
        
        return discriminator_prompt
    
    async def _evaluate_article(self, article: SearchArticle, discriminator: str) -> Tuple[FilteredArticle, LLMUsage]:
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
                messages=[user_message],
                return_usage=True
            )
            
            # Extract result and usage from LLMResponse
            llm_usage = result.usage
            llm_result = result.result
            
            # Convert to response model
            eval_data = llm_result.model_dump() if hasattr(llm_result, 'model_dump') else dict(llm_result)
            
            filtered_article = FilteredArticle(
                article=article,
                passed=eval_data.get("decision", "No") == "Yes",
                confidence=eval_data.get("confidence", 0.5),
                reasoning=eval_data.get("reasoning", "No reasoning provided")
            )
            
            return filtered_article, llm_usage
            
        except Exception as e:
            logger.error(f"Failed to evaluate article: {e}")
            # Default to not passing with low confidence, zero usage
            filtered_article = FilteredArticle(
                article=article,
                passed=False,
                confidence=0.0,
                reasoning=f"Evaluation failed: {str(e)}"
            )
            return filtered_article, LLMUsage()
    
    async def filter_articles_parallel(
        self,
        articles: List[SearchArticle],
        refined_question: str,
        search_query: str,
        strictness: str = "medium",
        custom_discriminator: str = None
    ) -> Tuple[List[FilteredArticle], LLMUsage]:
        """
        Filter articles in parallel using async concurrency
        Returns all filtered articles and aggregated token usage
        """
        logger.info(f"Starting parallel filtering of {len(articles)} articles")
        
        # Discriminator is required
        if not custom_discriminator:
            raise ValueError("Discriminator prompt is required for filtering")
        
        # Create semaphore to limit concurrent LLM calls (avoid rate limits)
        semaphore = asyncio.Semaphore(500)
        
        async def evaluate_with_semaphore(article: SearchArticle) -> Tuple[FilteredArticle, LLMUsage]:
            async with semaphore:
                return await self._evaluate_article(article, custom_discriminator)
        
        # Execute all evaluations in parallel
        logger.info(f"Executing {len(articles)} evaluations in parallel (max {semaphore._value} concurrent)")
        start_time = datetime.utcnow()
        
        results = await asyncio.gather(
            *[evaluate_with_semaphore(article) for article in articles],
            return_exceptions=True
        )
        
        duration = datetime.utcnow() - start_time
        logger.info(f"Parallel filtering completed in {duration.total_seconds():.2f} seconds")
        
        # Process results and aggregate token usage
        filtered_articles = []
        total_usage = LLMUsage()
        failed_count = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to evaluate article {i}: {result}")
                failed_count += 1
                # Create a failed/rejected article entry
                filtered_articles.append(FilteredArticle(
                    article=articles[i],
                    passed=False,
                    confidence=0.0,
                    reasoning=f"Evaluation failed: {str(result)}"
                ))
            else:
                filtered_article, usage = result
                filtered_articles.append(filtered_article)
                
                # Aggregate token usage
                total_usage.prompt_tokens += usage.prompt_tokens
                total_usage.completion_tokens += usage.completion_tokens
                total_usage.total_tokens += usage.total_tokens
        
        if failed_count > 0:
            logger.warning(f"{failed_count} articles failed evaluation")
        
        accepted_count = sum(1 for fa in filtered_articles if fa.passed)
        rejected_count = len(filtered_articles) - accepted_count
        
        logger.info(f"Parallel filtering results: {accepted_count} accepted, {rejected_count} rejected")
        
        return filtered_articles, total_usage
    
    async def extract_features_parallel(
        self,
        articles: List[Dict[str, Any]],
        features: List[FeatureDefinition]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Extract custom features from articles using parallel processing.
        
        Args:
            articles: List of accepted articles from filtered results  
            features: List of FeatureDefinition objects
            
        Returns:
            Dict mapping article_id to extracted features {feature_id: value}
        """
        logger.info(f"Starting parallel feature extraction for {len(articles)} articles with {len(features)} features")
        
        if not features:
            return {}
        
        # Import and initialize the extraction service
        from services.extraction_service import get_extraction_service
        extraction_service = get_extraction_service()
        
        # Build the schema for extraction (same logic as ArticleGroupDetailService)
        properties = {}
        for feature in features:
            properties[feature.name] = self._build_feature_schema(feature)
        
        result_schema = {
            "type": "object",
            "properties": properties,
            "required": [f.name for f in features]
        }
        
        # Build extraction instructions
        instruction_parts = []
        for feature in features:
            if feature.type == 'boolean':
                format_hint = "(Answer: 'yes' or 'no')"
            elif feature.type in ['score', 'number']:
                options = feature.options or {}
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                format_hint = f"(Numeric score {min_val}-{max_val})"
            else:
                format_hint = "(Brief text, max 100 chars)"
            
            instruction_parts.append(f"- {feature.name}: {feature.description} {format_hint}")
        
        extraction_instructions = "\n".join(instruction_parts)
        schema_key = f"features_{hash(tuple(f.name for f in features))}"
        
        # Create semaphore to limit concurrent LLM calls (avoid rate limits)
        semaphore = asyncio.Semaphore(100)  # Higher limit for feature extraction - can handle more concurrent requests
        
        async def extract_for_article(article: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
            async with semaphore:
                article_content = self._get_article_content(article)
                # Use the actual article ID from the data
                article_id = article['article']['id']
                
                try:
                    # Perform extraction for this article
                    extraction_result = await extraction_service.perform_extraction(
                        item={
                            "id": article_id,
                            "title": article_content.get('title', ''),
                            "abstract": article_content.get('abstract', '')
                        },
                        result_schema=result_schema,
                        extraction_instructions=extraction_instructions,
                        schema_key=schema_key
                    )
                    
                    # Process results
                    article_results = {}
                    if extraction_result.extraction:
                        for feature in features:
                            if feature.name in extraction_result.extraction:
                                raw_value = extraction_result.extraction[feature.name]
                                article_results[feature.id] = self._clean_value(raw_value, feature.type, feature.options)
                            else:
                                article_results[feature.id] = self._get_default_value(feature.type, feature.options)
                    else:
                        # No extraction results - use defaults
                        for feature in features:
                            article_results[feature.id] = self._get_default_value(feature.type, feature.options)
                    
                    return article_id, article_results
                    
                except Exception as e:
                    logger.error(f"Failed to extract features for article {article_id}: {e}")
                    # On error, use default values
                    article_results = {}
                    for feature in features:
                        article_results[feature.id] = self._get_default_value(feature.type, feature.options)
                    return article_id, article_results
        
        # Execute all extractions in parallel
        logger.info(f"Executing {len(articles)} feature extractions in parallel (max {semaphore._value} concurrent)")
        start_time = datetime.utcnow()
        
        results = await asyncio.gather(
            *[extract_for_article(article) for article in articles],
            return_exceptions=True
        )
        
        duration = datetime.utcnow() - start_time
        logger.info(f"Parallel feature extraction completed in {duration.total_seconds():.2f} seconds")
        
        # Process results
        final_results = {}
        failed_count = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to extract features for article {i}: {result}")
                failed_count += 1
                # Use article ID and default values for failed extractions
                article_id = self._get_article_id(articles[i])
                article_results = {}
                for feature in features:
                    article_results[feature.id] = self._get_default_value(feature.type, feature.options)
                final_results[article_id] = article_results
            else:
                article_id, article_results = result
                final_results[article_id] = article_results
        
        if failed_count > 0:
            logger.warning(f"{failed_count} articles failed feature extraction")
        
        logger.info(f"Feature extraction completed for {len(final_results)} articles")
        return final_results
    
    def _get_article_content(self, article: Dict) -> Dict:
        """Extract relevant content from article object."""
        # Handle both filtered article format and raw article format
        if 'article' in article:
            article_data = article['article']
        else:
            article_data = article
        
        return {
            'title': article_data.get('title', ''),
            'authors': ', '.join(article_data.get('authors', [])),
            'abstract': article_data.get('abstract', article_data.get('snippet', '')),
            'journal': article_data.get('journal', ''),
            'year': article_data.get('year', '')
        }
    
    def _get_article_id(self, article: Dict) -> str:
        """Generate consistent article ID."""
        # Handle both filtered article format and raw article format
        if 'article' in article:
            article_data = article['article']
        else:
            article_data = article
        
        # Use URL if available, otherwise create from title and authors
        if article_data.get('url'):
            return article_data['url']
        else:
            title = article_data.get('title', '')
            authors = article_data.get('authors', [])
            return f"{title[:50]}_{','.join(authors[:2])}"
    
    def _build_feature_schema(self, feature: FeatureDefinition) -> Dict[str, Any]:
        """Build JSON schema for a single feature."""
        if feature.type == 'boolean':
            return {
                "type": "string",
                "enum": ["yes", "no"],
                "description": feature.description
            }
        elif feature.type in ['score', 'number']:
            options = feature.options or {}
            return {
                "type": "number",
                "minimum": options.get('min', 1),
                "maximum": options.get('max', 10),
                "description": feature.description
            }
        else:  # text
            return {
                "type": "string",
                "maxLength": 100,
                "description": feature.description
            }
    
    def _clean_value(self, value: Any, feature_type: str, options: Optional[Dict[str, Any]] = None) -> str:
        """Clean and validate extracted values based on feature type."""
        if feature_type == "boolean":
            clean_val = str(value).lower().strip()
            return clean_val if clean_val in ["yes", "no"] else "no"
        elif feature_type in ["score", "number"]:
            try:
                num_val = float(value)
                opts = options or {}
                min_val = opts.get('min', 1)
                max_val = opts.get('max', 10)
                clamped = max(min_val, min(max_val, num_val))
                return str(int(clamped) if clamped.is_integer() else clamped)
            except (ValueError, TypeError):
                return str(options.get('min', 1) if options else 1)
        else:  # text
            return str(value)[:100] if value is not None else ""
    
    def _get_default_value(self, feature_type: str, options: Optional[Dict[str, Any]] = None) -> str:
        """Get default value for a feature type."""
        if feature_type == "boolean":
            return "no"
        elif feature_type in ["score", "number"]:
            return str(options.get('min', 1) if options else 1)
        else:  # text
            return ""