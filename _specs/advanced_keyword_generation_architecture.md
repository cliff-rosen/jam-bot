# Advanced Keyword Generation Service Architecture

## Overview
This document outlines the service architecture for implementing the three-stage Boolean search generation system described in keyword_gen.md, leveraging BasePromptCaller and existing SmartSearch capabilities.

## Service Components

### 1. ScopeRefinementService (Stage 1: Natural Language Scope Statement Generation)

```python
class ScopeRefinementService:
    """
    Interactive service to refine ambiguous evidence specifications into
    clean, testable scope statements using BasePromptCaller.
    """

    async def refine_scope(
        self,
        initial_input: str,
        interaction_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Refine user's initial input into clear scope statement.

        Returns:
            - refined_scope: Clean, unambiguous boundary definition
            - clarification_questions: Questions to resolve ambiguities
            - completeness_score: How complete the scope is (0-1)
            - missing_elements: What's missing for a complete scope
        """
        # Uses BasePromptCaller with task_config for "scope_refinement"
        # Model: gpt-5-mini with reasoning_effort: "medium"

    async def validate_scope(
        self,
        scope_statement: str
    ) -> Dict[str, Any]:
        """
        Validate if scope is specific, complete, testable, and mappable.
        """
        # Returns validation scores and suggestions
```

### 2. ConceptExtractionService (Stage 2: Concept Extraction & MeSH Mapping)

```python
class ConceptExtractionService:
    """
    Extract discrete biomedical concepts from scope statements and
    map them to MeSH terms with synonyms.
    """

    async def extract_concepts(
        self,
        scope_statement: str
    ) -> List[BiomedicalConcept]:
        """
        Extract key concepts using NER and pattern recognition.

        Returns list of concepts with:
            - concept: The primary term
            - role: organism/exposure/outcome/study_design
            - mesh_id: MeSH descriptor ID
            - synonyms: List of synonyms and variants
            - specificity: 0-1 score for constraining power
        """
        # Uses BasePromptCaller with structured output schema
        # Model: gpt-5-mini with reasoning_effort: "low"

    async def map_to_mesh(
        self,
        concept: str
    ) -> Dict[str, Any]:
        """
        Map a concept to MeSH terms using NCBI E-utilities API.
        """
        # Integrates with PubMed E-utilities for MeSH lookup

    async def expand_synonyms(
        self,
        mesh_term: str
    ) -> List[str]:
        """
        Expand MeSH term with entry terms and common variants.
        """
        # Uses MeSH tree hierarchy and synonym database
```

### 3. IterativeSearchConstructor (Stage 3: Boolean Query Optimization)

```python
class IterativeSearchConstructor:
    """
    Build optimized Boolean queries through iterative refinement,
    balancing recall and result volume.
    """

    async def construct_query(
        self,
        concepts: List[BiomedicalConcept],
        max_results: int = 500,
        optimization_strategy: str = "recall_first"
    ) -> SearchQuery:
        """
        Generate Boolean query through iterative testing.

        Strategy:
        1. Start with minimal high-specificity concepts
        2. Expand with OR synonyms
        3. Test result count
        4. Add AND constraints if too broad
        5. Iterate until optimal
        """
        # Uses existing search_pubmed_count for testing

    async def test_query_breadth(
        self,
        query: str
    ) -> Dict[str, Any]:
        """
        Test query and return metrics.
        """
        # Leverages existing PubMedService

    async def optimize_query(
        self,
        query: str,
        target_range: Tuple[int, int]
    ) -> str:
        """
        Optimize query to hit target result range.
        """
        # Uses BasePromptCaller for query refinement suggestions
```

### 4. IntegratedKeywordPipeline (Orchestration Service)

```python
class IntegratedKeywordPipeline:
    """
    End-to-end pipeline orchestrating all three stages with
    SmartSearch integration.
    """

    async def generate_search_strategy(
        self,
        user_input: str,
        target_source: str = "pubmed",
        optimization_params: Dict = None
    ) -> SearchStrategy:
        """
        Complete pipeline from natural language to optimized Boolean.

        Flow:
        1. Refine scope statement
        2. Extract concepts
        3. Construct Boolean query
        4. Return search strategy with alternatives
        """

    async def test_and_refine(
        self,
        search_strategy: SearchStrategy,
        sample_articles: List[str] = None
    ) -> RefinedStrategy:
        """
        Test strategy against known relevant articles and refine.
        """
        # Integration with existing filter_articles_parallel

    async def export_search(
        self,
        strategy: SearchStrategy,
        format: str = "pubmed_advanced"
    ) -> str:
        """
        Export search in various formats (PubMed, Ovid, etc.)
        """
```

### 5. Integration with Existing SmartSearch Services

```python
# Extension to existing SmartSearchService
class EnhancedSmartSearchService(SmartSearchService):
    """
    Extends SmartSearchService with advanced keyword generation.
    """

    def __init__(self):
        super().__init__()
        self.scope_refiner = ScopeRefinementService()
        self.concept_extractor = ConceptExtractionService()
        self.query_constructor = IterativeSearchConstructor()
        self.pipeline = IntegratedKeywordPipeline()

    async def generate_advanced_keywords(
        self,
        evidence_specification: str,
        optimization_level: str = "balanced"
    ) -> Dict[str, Any]:
        """
        Use advanced pipeline instead of simple keyword generation.
        """
        # Replaces or enhances existing generate_search_keywords
```

## Database Models for Persistence

```python
# New SQLAlchemy models
class SearchConcept(Base):
    """Store extracted concepts with MeSH mappings."""
    id = Column(String, primary_key=True)
    concept = Column(String)
    role = Column(String)  # organism/exposure/outcome
    mesh_id = Column(String)
    synonyms = Column(JSON)
    specificity = Column(Float)
    session_id = Column(String, ForeignKey('smart_search_sessions.id'))

class SearchIteration(Base):
    """Track iterative query refinement history."""
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('smart_search_sessions.id'))
    iteration = Column(Integer)
    query = Column(Text)
    result_count = Column(Integer)
    strategy_notes = Column(Text)
```

## API Endpoints for Frontend Integration

```python
# New endpoints in smart_search2.py or dedicated router
@router.post("/advanced-keyword-generation")
async def generate_advanced_keywords(
    request: AdvancedKeywordRequest
) -> AdvancedKeywordResponse:
    """
    Full pipeline: scope → concepts → Boolean query
    """

@router.post("/refine-scope")
async def refine_scope_statement(
    request: ScopeRefinementRequest
) -> ScopeRefinementResponse:
    """
    Interactive scope refinement with clarification questions
    """

@router.post("/extract-concepts")
async def extract_biomedical_concepts(
    request: ConceptExtractionRequest
) -> ConceptExtractionResponse:
    """
    Extract and rank concepts from scope statement
    """

@router.post("/test-query-coverage")
async def test_query_coverage(
    request: QueryCoverageRequest
) -> QueryCoverageResponse:
    """
    Test if query captures known relevant articles
    """
```

## Key Implementation Details

### BasePromptCaller Configuration

Different task configurations for each stage:

```python
TASK_CONFIGS = {
    "keyword_generation": {
        "scope_refinement": {
            "model": "gpt-5-mini",
            "reasoning_effort": "medium",
            "description": "Refine ambiguous scope statements"
        },
        "concept_extraction": {
            "model": "gpt-5-mini",
            "reasoning_effort": "low",
            "description": "Extract biomedical concepts"
        },
        "query_optimization": {
            "model": "gpt-5",
            "reasoning_effort": "high",
            "description": "Optimize Boolean query construction"
        }
    }
}
```

### Structured Output Schemas

```python
# Concept extraction output schema
CONCEPT_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "concept": {"type": "string"},
            "role": {"type": "string", "enum": ["organism", "exposure", "outcome", "study_design"]},
            "mesh_id": {"type": "string"},
            "synonyms": {"type": "array", "items": {"type": "string"}},
            "specificity": {"type": "number", "minimum": 0, "maximum": 1}
        },
        "required": ["concept", "role", "specificity"]
    }
}
```

### Integration Points

1. **Reuse Existing Services**:
   - `PubMedService` for search testing and result counting
   - `filter_articles_parallel` for semantic validation
   - `SmartSearchSessionService` for tracking iterations

2. **Extend Current Capabilities**:
   - Enhance `generate_search_keywords` with advanced pipeline option
   - Add concept persistence to SmartSearch sessions
   - Integrate with PubMed Search Designer for validation

### Optimization Strategy

```python
class OptimizationStrategy:
    """
    Define optimization approaches for different use cases.
    """

    RECALL_FIRST = {
        "initial_concepts": 2,  # Start minimal
        "expansion_aggressive": True,  # Broad synonyms
        "constraint_threshold": 1000,  # Add constraints if > 1000 results
        "min_coverage": 0.95  # Accept 95% recall
    }

    PRECISION_FIRST = {
        "initial_concepts": 4,  # Start with more constraints
        "expansion_conservative": True,  # Exact synonyms only
        "constraint_threshold": 200,
        "min_coverage": 0.80
    }

    BALANCED = {
        "initial_concepts": 3,
        "expansion_moderate": True,
        "constraint_threshold": 500,
        "min_coverage": 0.90
    }
```

## User Experience Flow

### Interactive Refinement Process

1. **Initial Input**: User provides natural language query
2. **Scope Clarification**: System asks clarifying questions
3. **Concept Review**: User reviews extracted concepts
4. **Query Testing**: Real-time result count preview
5. **Coverage Validation**: Test against known relevant articles
6. **Export Options**: Multiple format export (PubMed, Ovid, etc.)

### Frontend Components

```typescript
// New components for SmartSearch2
interface KeywordGenerationWizard {
    // Multi-step wizard for the full pipeline
    steps: ['scope', 'concepts', 'query', 'validate', 'export'];
    currentStep: number;
    onStepComplete: (data: any) => void;
}

interface ConceptEditor {
    // Interactive concept editing with MeSH lookup
    concepts: BiomedicalConcept[];
    onConceptEdit: (concept: BiomedicalConcept) => void;
    onSynonymAdd: (conceptId: string, synonym: string) => void;
}

interface QueryTester {
    // Real-time query testing interface
    query: string;
    resultCount: number;
    isLoading: boolean;
    coverageArticles: string[];
    onQueryModify: (query: string) => void;
}
```

## Implementation Phases

### Phase 1: Core Services (Week 1-2)
- Implement ConceptExtractionService
- Basic MeSH mapping functionality
- Integration with existing PubMedService

### Phase 2: Query Construction (Week 3-4)
- IterativeSearchConstructor implementation
- Query testing and optimization logic
- Result volume management

### Phase 3: Scope Refinement (Week 5-6)
- ScopeRefinementService with interactive prompting
- Validation and completeness scoring
- Integration with concept extraction

### Phase 4: Full Pipeline (Week 7-8)
- IntegratedKeywordPipeline orchestration
- Database persistence models
- API endpoints and frontend integration

### Phase 5: Advanced Features (Week 9-10)
- Export formats for different databases
- Coverage validation against known articles
- Integration with PubMed Search Designer

## Success Metrics

1. **Query Efficiency**:
   - Reduction in initial result volume by 60-80%
   - Maintain 90%+ recall of relevant articles

2. **User Experience**:
   - Time to generate optimized query < 2 minutes
   - Interactive refinement satisfaction > 4/5

3. **Search Quality**:
   - Precision improvement of 40-60% over basic keyword search
   - Successful MeSH mapping for 85%+ of concepts

4. **System Performance**:
   - Concurrent query testing < 500ms per iteration
   - Pipeline completion < 30 seconds end-to-end

## Technical Considerations

### Caching Strategy
- Cache MeSH lookups for 24 hours
- Cache query result counts for 1 hour
- Store successful search strategies for reuse

### Error Handling
- Graceful fallback when MeSH mapping fails
- Query timeout handling for complex Boolean expressions
- User-friendly error messages for refinement suggestions

### Scalability
- Async/await for all external API calls
- Batch concept extraction for multiple scope statements
- Rate limiting for PubMed E-utilities API

## Future Enhancements

1. **Machine Learning Integration**:
   - Learn from user query refinement patterns
   - Predict optimal concept combinations
   - Automatic synonym discovery from literature

2. **Multi-Database Support**:
   - Extend beyond PubMed to Embase, Web of Science
   - Cross-database query translation
   - Unified result deduplication

3. **Collaborative Features**:
   - Share search strategies between researchers
   - Crowd-sourced concept synonym databases
   - Team-based query refinement workflows