# Smart Search Lab Feature Specification

## Overview
Add a smart search workflow to the Lab that helps users find relevant research articles through an LLM-guided search process.

## User Flow
1. User enters research question
2. System refines question and generates keywords
3. System searches and applies semantic filtering
4. User reviews filtered results

## Implementation Plan

### Phase 1: Basic Smart Search (MVP)

#### Backend Structure

**1. Schema (`backend/schemas/smart_search.py`)**
```python
class SmartSearchRequest(BaseModel):
    query: str
    max_results: int = 50

class SmartSearchRefinementResponse(BaseModel):
    original_query: str
    refined_query: str
    keywords: List[str]
    search_strategy: str

class SemanticFilterRequest(BaseModel):
    articles: List[Dict[str, Any]]
    discriminator_prompt: str
    
class FilteredArticle(BaseModel):
    article: Dict[str, Any]
    passed: bool
    confidence: float
    reasoning: str
```

**2. Service (`backend/services/smart_search_service.py`)**
```python
class SmartSearchService:
    async def refine_search_query(self, query: str) -> SmartSearchRefinementResponse
    async def generate_semantic_discriminator(self, refined_query: str, keywords: List[str]) -> str
    async def search_articles(self, keywords: List[str]) -> List[Dict]
    async def filter_articles_streaming(self, articles: List[Dict], discriminator: str)
```

**3. Router (`backend/routers/smart_search.py`)**
Following your existing pattern:
- `POST /api/lab/smart-search/refine` - Refine query and generate keywords
- `POST /api/lab/smart-search/execute` - Run search with keywords
- `POST /api/lab/smart-search/filter-stream` - Stream filtering results

#### Frontend Structure

**1. API Client (`frontend/src/lib/api/smartSearchApi.ts`)**
Following your `labApi.ts` pattern with streaming support.

**2. Main Component (`frontend/src/pages/SmartSearchLab.tsx`)**
Single-file component following your Lab.tsx pattern with clear steps:
- Step 1: Query input
- Step 2: Review refinement & keywords
- Step 3: Filtering progress (with streaming)
- Step 4: Results display

**3. Types (`frontend/src/types/smart-search.ts`)**
Minimal types matching backend schemas:
```typescript
interface SmartSearchRefinement {
  original_query: string;
  refined_query: string;
  keywords: string[];
  search_strategy: string;
}

interface FilteredArticle {
  article: {
    title: string;
    abstract: string;
    authors: string[];
    year: number;
    doi?: string;
    pmid?: string;
  };
  passed: boolean;
  confidence: number;
  reasoning: string;
}
```

### Integration Points

**With Existing Features:**
- Use existing `GoogleScholarService` and `PubmedService` for search
- Reuse streaming patterns from `IterativeAnswerService`
- Save results to article groups using existing `ArticleGroupService`

**Minimal New Dependencies:**
- No new database tables initially (use JSON storage if needed)
- Leverage existing LLM integration patterns
- Use existing authentication/validation

### Key Simplifications

**What We're NOT Building (Initially):**
- Complex session management
- Search templates/history
- WebSocket connections (use SSE like existing lab)
- Multiple search engines in parallel
- Batch processing configuration
- Analytics/metrics tracking
- Export functionality (can use existing group export)

**What We ARE Building:**
- Core search refinement flow
- Simple keyword generation
- Basic semantic filtering
- Results display with save to groups

### UI Approach

Following your existing Lab.tsx pattern:
- Single page with step progression
- Cards for each section
- Loading states with spinners
- Toast notifications for feedback
- Dark mode support
- No complex state management (just useState)

### API Design

**Refinement Endpoint:**
```python
@router.post("/refine")
async def refine_search(request: SmartSearchRequest):
    # Returns refined query + keywords in one call
    return {
        "refined_query": "...",
        "keywords": [...],
        "search_strategy": "..."
    }
```

**Search Endpoint:**
```python
@router.post("/execute")
async def execute_search(keywords: List[str]):
    # Simple search, returns articles
    return {
        "articles": [...],
        "total": 25
    }
```

**Filter Endpoint (Streaming):**
```python
@router.post("/filter-stream")
async def filter_articles_stream(request: SemanticFilterRequest):
    # Stream each filtering decision
    async def generate():
        for article in articles:
            result = await filter_article(article, discriminator)
            yield f"data: {json.dumps(result)}\n\n"
    return StreamingResponse(generate())
```

### Implementation Steps

1. **Backend First:**
   - Create schemas
   - Implement service with basic LLM calls
   - Add router endpoints
   - Test with Postman/curl

2. **Frontend Second:**
   - Create API client
   - Build single-page component
   - Add types
   - Wire up to backend

3. **Polish:**
   - Error handling
   - Loading states
   - Save to groups integration

### Example LLM Prompts (Simple)

**Query Refinement:**
```
Original query: {query}

Make this research query more specific and searchable.
Return:
1. A refined version of the query
2. 5-10 keywords for searching
3. A brief search strategy
```

**Semantic Discriminator:**
```
Research query: {refined_query}
Keywords: {keywords}

Create a Yes/No evaluation prompt that will determine if an article matches this research intent.
The prompt should be specific and binary.
```

**Article Filtering:**
```
{discriminator_prompt}

Article:
Title: {title}
Abstract: {abstract}

Answer: Yes/No
Confidence: 0-1
Reasoning: Brief explanation
```

### Success Criteria

- User can go from query to filtered results in < 2 minutes
- Filtering accuracy > 70%
- UI feels responsive with streaming updates
- Integrates cleanly with existing Lab features
- Code follows existing patterns (no new paradigms)

### Future Enhancements (Phase 2)

After MVP is working:
- Add search history
- Multiple search sources
- Keyword editing UI
- Discriminator tuning
- Batch operations
- Export options