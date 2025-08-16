"""
Smart Search Service

Service for intelligent research article search with LLM-powered refinement and filtering.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, AsyncGenerator, Tuple
from datetime import datetime

from schemas.smart_search import (
    SmartSearchRefinementResponse,
    SearchArticle,
    SearchResultsResponse,
    SearchPaginationInfo,
    FilteredArticle,
    FilteringProgress
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
        
    async def create_evidence_specification(self, query: str) -> Tuple[str, LLMUsage]:
        """
        Step 2: Create evidence specification from user's query using LLM
        """
        logger.info(f"Step 2 - Creating evidence specification from: {query[:100]}...")
        
        # Create prompt for evidence specification
        system_prompt = """You are an evidence specification expert. Your task is to convert a user's search query into a clear specification for finding relevant documents. 

The goal is to create a specification that starts with "Find articles that..." and clearly describes what evidence or documents are needed.

GUIDELINES:
- Always start with "Find articles that..."
- Focus on what documents/evidence are needed, not questions to answer
- Use clear, specific language about document types and content
- Preserve the user's original intent and scope
- Use standard scientific/medical terminology where appropriate
- Be concise but specific

EXAMPLES:
Original: "effects of exercise on health"
Evidence Spec: "Find articles that examine the health effects of physical exercise"

Original: "How does AI help doctors?"
Evidence Spec: "Find articles that discuss artificial intelligence applications in clinical practice"

Original: "cancer treatment effectiveness"
Evidence Spec: "Find articles that evaluate the effectiveness of cancer treatment methods"

Original: "CRISPR gene editing safety"
Evidence Spec: "Find articles that assess the safety profile of CRISPR gene editing technologies"

Respond in JSON format with the evidence specification in the "evidence_specification" field."""

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
    
    # Legacy method for backward compatibility
    async def refine_research_question(self, question: str) -> Tuple[str, LLMUsage]:
        """Legacy method - redirects to create_evidence_specification"""
        return await self.create_evidence_specification(question)
    
    async def generate_search_keywords(self, evidence_specification: str) -> Tuple[str, LLMUsage]:
        """
        Step 3: Generate boolean search query from the evidence specification using LLM
        """
        logger.info(f"Step 3 - Generating search keywords from evidence specification...")
        
        # Create prompt for search keyword generation
        system_prompt = """You are a search query expert for academic databases like PubMed and Google Scholar. Your task is to convert an evidence specification into an EFFECTIVE and BALANCED search query.

CORE PRINCIPLES:
- Target 500-2000 relevant results (not too broad, not too narrow)
- Use simple, clear keywords that researchers actually use
- Avoid overly complex boolean logic
- Focus on the most important 2-3 concepts

GUIDELINES:
1. Identify the 2-3 CORE concepts from the evidence specification
2. For each concept, use 2-4 of the most common synonyms/variants
3. Use AND to connect different concepts
4. Use OR only for true synonyms within the same concept
5. Prefer individual keywords over exact phrases
6. Use scientific terminology that appears in abstracts and titles
7. Avoid overly broad terms (like "treatment" alone) or overly specific terms

QUERY STRUCTURE:
- Simple format: (concept1 OR synonym1) AND (concept2 OR synonym2)
- Maximum 3 AND-connected concept groups
- 2-4 terms per OR group
- No nested parentheses

GOOD EXAMPLES:
- (diabetes OR diabetic) AND (neuropathy OR "nerve damage") AND (treatment OR therapy)
- (CRISPR OR "gene editing") AND (cancer OR tumor) 
- (obesity OR overweight) AND (children OR pediatric) AND (intervention OR prevention)

BAD EXAMPLES (too complex):
- (diabetes OR diabetic OR glycemic OR "blood sugar" OR hyperglycemia) AND (neuropathy OR "nerve damage" OR "peripheral nerve" OR polyneuropathy) AND (treatment OR therapy OR management OR intervention OR medication)

BAD EXAMPLES (too simple):
- diabetes treatment
- cancer

Respond in JSON format with a "search_query" field containing the boolean search string."""

        user_prompt = f"""Evidence specification: {evidence_specification}

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
    
    async def get_search_count(self, search_query: str) -> Tuple[int, List[str]]:
        """
        Get total count of search results without retrieving articles
        """
        logger.info(f"Getting result count for query: {search_query[:100]}...")
        
        try:
            # Use the existing search method but with count_only mode
            # We'll need to modify search_articles to support count-only mode
            search_response = await self.search_articles(search_query, max_results=1, offset=0, count_only=True)
            return search_response.pagination.total_available, search_response.sources_searched
        except Exception as e:
            logger.error(f"Failed to get search count: {e}")
            return 0, []
    
    def get_refinement_strategy(self, evidence_spec: str) -> List[str]:
        """
        Determine refinement terms based on evidence specification content
        """
        evidence_lower = evidence_spec.lower()
        refinement_terms = []
        
        # Clinical/Medical evidence
        if any(term in evidence_lower for term in ['treatment', 'therapy', 'clinical', 'patient', 'medical', 'drug', 'medication']):
            refinement_terms.extend(['(clinical OR trial OR study OR patient OR treatment)', '(human OR humans)'])
        
        # Behavioral/Psychological evidence  
        if any(term in evidence_lower for term in ['behavior', 'behaviour', 'psychological', 'cognitive', 'mental', 'motivation', 'depression']):
            refinement_terms.extend(['(study OR research OR analysis OR survey)', '(longitudinal OR cross-sectional OR cohort OR randomized)'])
        
        # Technology/AI evidence
        if any(term in evidence_lower for term in ['algorithm', 'model', 'ai', 'artificial intelligence', 'machine learning', 'technology']):
            refinement_terms.extend(['(evaluation OR performance OR validation OR comparison)', '(algorithm OR model OR system OR method)'])
        
        # General research quality filters
        refinement_terms.extend([
            '(outcome OR effectiveness OR efficacy OR result)',
            '(research OR study OR analysis OR investigation)'
        ])
        
        return refinement_terms
    
    async def refine_query_for_volume(self, initial_query: str, evidence_spec: str, target_max: int = 250) -> Tuple[str, str]:
        """
        Refine a search query to reduce result volume while maintaining relevance
        """
        logger.info(f"Refining query to target {target_max} results...")
        
        refinement_terms = self.get_refinement_strategy(evidence_spec)
        refined_query = initial_query
        refinements_applied = []
        
        # Try adding refinement terms one by one until we get under target
        for term in refinement_terms:
            test_query = f"({refined_query}) AND {term}"
            count, _ = await self.get_search_count(test_query)
            
            if count <= target_max and count > 0:
                refined_query = test_query
                refinements_applied.append(term)
                logger.info(f"Applied refinement '{term}': {count} results")
                break
            elif count == 0:
                # This refinement was too restrictive, skip it
                continue
            else:
                # Still too many results, try this refinement and continue
                refined_query = test_query
                refinements_applied.append(term)
                logger.info(f"Applied refinement '{term}': {count} results (still above target)")
        
        refinement_description = f"Added: {', '.join(refinements_applied)}" if refinements_applied else "No refinements applied"
        return refined_query, refinement_description
    
    async def add_targeted_refinement(self, current_query: str, current_count: int, evidence_spec: str, target_max: int = 250) -> Tuple[str, str]:
        """
        Add a single targeted AND refinement to the current query to reduce volume
        with minimal Type II error risk
        """
        logger.info(f"Adding targeted refinement to: {current_query[:100]}... (current: {current_count:,} → target: <{target_max})")
        
        # Use LLM to suggest a targeted refinement
        system_prompt = """You are a search query refinement expert. Your task is to add ONE targeted AND clause to reduce search results to the target range while maintaining relevance.

CRITICAL REQUIREMENTS:
1. The current query returns too many results and MUST be reduced to the target range
2. Add ONE specific AND clause - NOT a broad OR clause with many alternatives
3. Choose the MOST RESTRICTIVE reasonable filter from the evidence specification that will not produce excessive type II errors
4. Prefer single terms or small 2-3 term OR groups, NOT large OR lists
5. Focus on the most specific, distinctive aspect that will actually filter results.
6. The current query returns {current_count:,} results, so we need to reduce this to under {target_max}.

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

        user_prompt = f"""Current query: {current_query}
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
            
            if hasattr(llm_result, 'refined_query'):
                refined_query = llm_result.refined_query
                explanation = llm_result.explanation if hasattr(llm_result, 'explanation') else "LLM-generated refinement"
            else:
                # Fallback to model_dump
                response_data = llm_result.model_dump() if hasattr(llm_result, 'model_dump') else {}
                refined_query = response_data.get('refined_query', f"({current_query}) AND (study OR research)")
                explanation = response_data.get('explanation', "Added research focus as fallback refinement")
                
            logger.info(f"LLM suggested refinement: {refined_query}")
            logger.info(f"Explanation: {explanation}")
            return refined_query, explanation
            
        except Exception as e:
            logger.error(f"Failed to generate LLM refinement: {e}")
            # Conservative fallback: add research/study filter
            fallback_query = f"({current_query}) AND (study OR research OR analysis)"
            return fallback_query, "Added research focus (fallback refinement)"
    
    async def generate_optimized_search_query(self, current_query: str, evidence_spec: str, target_max: int = 250) -> Tuple[str, int, str, int, str, str]:
        """
        Generate an optimized search query by adding refinements to the current query
        Returns: (initial_query, initial_count, final_query, final_count, refinement_description, status)
        """
        logger.info(f"Optimizing current query: {current_query[:100]}...")
        
        # Phase 1: Get current query count
        initial_query = current_query
        initial_count, _ = await self.get_search_count(initial_query)
        
        logger.info(f"Current query has {initial_count} results")
        
        # Phase 2: Check if refinement is needed
        if initial_count <= target_max:
            return initial_query, initial_count, initial_query, initial_count, "Query already optimal", "optimal"
        
        # Phase 3: Add targeted refinement to current query
        final_query, refinement_description = await self.add_targeted_refinement(initial_query, initial_count, evidence_spec, target_max)
        final_count, _ = await self.get_search_count(final_query)
        
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
        return initial_query, initial_count, final_query, final_count, refinement_description, status
      
    async def search_articles(self, search_query: str, max_results: int = 50, offset: int = 0, count_only: bool = False) -> SearchResultsResponse:
        """
        Search for articles using search query across multiple sources
        """
        if count_only:
            logger.info(f"Getting count for query: {search_query}")
        else:
            logger.info(f"Searching with query: {search_query}, max_results: {max_results}, offset: {offset}")
        
        all_articles = []
        sources_searched = []
        total_available = 0
        
        # Search PubMed
        try:
            logger.info("Searching PubMed...")
            # Use search_pubmed function from pubmed_service (it's a sync function)
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            
            if count_only:
                # For count-only mode, just get metadata with minimal results
                pubmed_articles, metadata = await loop.run_in_executor(
                    None, 
                    search_pubmed,
                    search_query,
                    1,  # Minimal results for count-only
                    0
                )
                total_available = metadata.get('total_results', 0)
            else:
                # Normal search mode
                pubmed_articles, metadata = await loop.run_in_executor(
                    None, 
                    search_pubmed,
                    search_query,
                    max_results,  # Use full max_results since Scholar is disabled
                    offset
                )
                
                # Get total count from metadata
                total_available = metadata.get('total_results', 0)
                
                for article in pubmed_articles:
                    # article is now a CanonicalResearchArticle, not the raw Article class
                    all_articles.append(SearchArticle(
                        title=article.title,
                        abstract=article.abstract if article.abstract else "",
                        authors=article.authors if article.authors else [],
                        year=article.publication_year if article.publication_year else 0,
                        journal=article.journal if article.journal else None,
                        doi=article.doi if article.doi else None,
                        pmid=article.id.replace("pubmed_", "") if article.id and article.id.startswith("pubmed_") else None,
                        url=article.url if article.url else None,
                        source="pubmed"
                    ))
            sources_searched.append("pubmed")
            logger.info(f"Found {len(pubmed_articles)} PubMed articles")
            
        except Exception as e:
            logger.error(f"PubMed search failed: {e}")
        
        # Search Google Scholar - TEMPORARILY DISABLED
        # try:
        #     logger.info("Searching Google Scholar...")
        #     # Google Scholar service is also sync, run in executor
        #     loop = asyncio.get_event_loop()
        #     scholar_articles, _ = await loop.run_in_executor(
        #         None,
        #         self.google_scholar_service.search_articles,
        #         search_query,
        #         max_results // 2
        #     )
        #     
        #     for article in scholar_articles:
        #         all_articles.append(SearchArticle(
        #             title=article.title if article.title else "",
        #             abstract=article.snippet if article.snippet else "",  # Scholar uses 'snippet' for abstract
        #             authors=article.authors if article.authors else [],
        #             year=article.year if article.year else 0,
        #             journal=article.venue if hasattr(article, 'venue') else None,
        #             doi=None,  # Scholar doesn't always provide DOI
        #             pmid=None,
        #             url=article.link if article.link else None,
        #             source="google_scholar"
        #         ))
        #     sources_searched.append("google_scholar")
        #     logger.info(f"Found {len(scholar_articles)} Google Scholar articles")
        #     
        # except Exception as e:
        #     logger.error(f"Google Scholar search failed: {e}")
        
        # Create pagination info
        pagination = SearchPaginationInfo(
            total_available=total_available,
            returned=len(all_articles),
            offset=offset,
            has_more=offset + len(all_articles) < total_available
        )
        
        return SearchResultsResponse(
            articles=all_articles,
            pagination=pagination,
            sources_searched=sources_searched
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
    
    async def filter_articles_streaming(
        self,
        articles: List[SearchArticle],
        refined_question: str,
        search_query: str,
        strictness: str = "medium",
        custom_discriminator: str = None
    ) -> AsyncGenerator[str, None]:
        """
        Filter articles using semantic discriminator with streaming updates
        """
        logger.info(f"Starting filtering of {len(articles)} articles")
        
        # Discriminator is required
        if not custom_discriminator:
            raise ValueError("Discriminator prompt is required for filtering")
        
        discriminator = custom_discriminator
        logger.info("Using provided discriminator prompt")
        
        # Initialize counters
        total = len(articles)
        processed = 0
        accepted = 0
        rejected = 0
        
        # Initialize token usage tracking
        total_filtering_tokens = LLMUsage()
        
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
                result, usage = await self._evaluate_article(article, discriminator)
                
                # Accumulate token usage
                total_filtering_tokens.prompt_tokens += usage.prompt_tokens
                total_filtering_tokens.completion_tokens += usage.completion_tokens
                total_filtering_tokens.total_tokens += usage.total_tokens
                
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
        
        # Send completion message with token usage
        completion_data = {
            'total_processed': processed, 
            'accepted': accepted, 
            'rejected': rejected,
            'token_usage': {
                'prompt_tokens': total_filtering_tokens.prompt_tokens,
                'completion_tokens': total_filtering_tokens.completion_tokens,
                'total_tokens': total_filtering_tokens.total_tokens
            }
        }
        yield f"data: {json.dumps({'type': 'complete', 'data': completion_data, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        logger.info(f"Filtering complete: {accepted}/{total} articles accepted")
    
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