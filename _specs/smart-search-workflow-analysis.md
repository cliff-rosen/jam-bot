# Smart Search Lab Workflow Analysis

## Current Workflow State Mapping

| Step | UI Label | User Action | Frontend Logic | Backend Call | Backend Processing | Output | Next Step Trigger |
|------|----------|-------------|----------------|--------------|-------------------|---------|------------------|
| 1 | Question Input | **USER**: Enters research question in text area | State: `question` updated | None | None | Question text stored in state | **USER** clicks "Refine Question" |
| 2 | Question Refinement | **USER**: Reviews refined question | Frontend calls `/refine` API | **BACKEND**: `POST /lab/smart-search/refine` | LLM refines the question using `refine_research_question()` | `SmartSearchRefinementResponse` with `refined_query` | **USER** clicks "Generate Search Query" |
| 3 | Search Query Generation | **USER**: Reviews boolean search query | Frontend calls `/generate-query` API | **BACKEND**: `POST /lab/smart-search/generate-query` | LLM converts refined question to boolean query using `generate_search_query()` | `SearchQueryResponse` with boolean `search_query` | **USER** clicks "Execute Search" |
| 4 | Search Execution | **USER**: Waits for search results | Frontend calls `/execute` API | **BACKEND**: `POST /lab/smart-search/execute` | Searches PubMed & Google Scholar using `search_articles()` | `SearchResultsResponse` with array of articles | **USER** sets filtering options and clicks "Filter Articles" |
| 5 | Semantic Filtering Setup | **USER**: Sets strictness level (low/medium/high) | Frontend prepares filter request | None | None | Filter options stored | **USER** clicks "Start Filtering" |
| 6 | Semantic Filtering (Streaming) | **USER**: Watches progress | Frontend calls `/filter-stream` API | **BACKEND**: `POST /lab/smart-search/filter-stream` (SSE) | LLM evaluates each article using `filter_articles_streaming()` | Streaming `FilteredArticle` results with pass/fail decisions | Automatic completion when all articles processed |
| 7 | Review Results | **USER**: Reviews filtered articles | Frontend displays results | None | None | Final filtered article list | Workflow complete |

## Issues Identified

### 1. **User Experience Flow Problems**
- **Problem**: Users must manually click through each step
- **Issue**: Steps 2-4 could be automatic backend processing while step 5-6 is the actual user review point
- **Current**: User reviews LLM refinement and search query generation
- **Should be**: User submits question → backend processes steps 2-4 automatically → user reviews search results and sets filtering options

### 2. **API Call Granularity**
- **Problem**: Too many discrete API calls for what should be background processing
- **Current**: 4 separate API calls (`/refine`, `/generate-query`, `/execute`, `/filter-stream`)
- **Should be**: 2 API calls (`/search` for steps 2-4, `/filter-stream` for steps 6-7)

### 3. **Step Naming Confusion**
- **Problem**: UI step names don't clearly indicate what the user is doing vs what the system is doing
- **Current**: "Question Refinement" - unclear if user is refining or reviewing
- **Should be**: "Processing Search..." vs "Review Search Results"

### 4. **Workflow State Management**
- **Problem**: Each step requires the previous step's output but UI doesn't clearly show the flow
- **Current**: Linear progression with manual advancement
- **Should be**: Background processing with progress indicators and clear user decision points

## Proposed Workflow Redesign

| Step | UI Label | User Action | Backend Processing | Output | User Decision Point |
|------|----------|-------------|-------------------|---------|-------------------|
| 1 | Submit Question | **USER**: Enters question and clicks "Search" | **AUTO**: Refine question → Generate boolean query → Execute search | Search results with metadata | **USER**: Reviews results and decides to filter |
| 2 | Review Results | **USER**: Reviews search results, sets filter strictness | None | Filter settings stored | **USER**: Clicks "Filter Results" |
| 3 | Filter Results | **USER**: Watches filtering progress | **STREAMING**: LLM evaluates each article | Filtered results | **USER**: Reviews final results |

### Benefits of Redesign:
1. **Clearer user intent**: User submits question and gets search results
2. **Reduced friction**: No need to review intermediate LLM outputs
3. **Better UX**: Processing happens in background with progress indicators
4. **Logical decision points**: User makes decisions about filtering, not LLM processing steps

## Technical Implementation Changes Needed

### Frontend Changes:
1. Combine steps 2-4 into a single "Processing" state with progress indicator
2. Single `/search` API call that returns final search results
3. Clear separation between "system processing" and "user review" phases

### Backend Changes:
1. Create new `/search` endpoint that internally calls `refine_research_question()` → `generate_search_query()` → `search_articles()`
2. Keep existing `/filter-stream` endpoint for semantic filtering
3. Add progress indicators for the combined search process

### API Design:
```
POST /lab/smart-search/search
- Input: { query: string, max_results?: number }
- Output: { original_query, refined_query, search_query, articles[], metadata }

POST /lab/smart-search/filter-stream  
- Input: { articles[], refined_query, search_query, strictness }
- Output: SSE stream of filtered results
```

This redesign aligns the technical implementation with user intent and creates a more logical workflow.