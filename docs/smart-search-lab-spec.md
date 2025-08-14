# Smart Search Lab Component Specification

## Overview
The Smart Search Lab is an intelligent research article discovery system that combines LLM-powered query refinement, keyword generation, and semantic filtering to deliver highly relevant research results.

## Core Workflow

### 1. Query Submission & Refinement
- User enters a research question in natural language
- System proposes a refined, more precise version of the question
- User can accept, edit, or reject the refinement

### 2. Keyword Generation
- LLM analyzes the refined question to extract search keywords
- Keywords are categorized (e.g., primary terms, medical conditions, interventions, outcomes)
- User can review and modify the generated keywords

### 3. Search Execution
- Keywords are submitted to configured search engines (PubMed, Google Scholar, etc.)
- Raw results are collected and deduplicated
- Progress is shown in real-time

### 4. Semantic Discrimination
- LLM generates a semantic discriminator prompt based on the original research mandate
- The discriminator acts as a binary classifier: "Does this article meet the search requirements? Yes/No"
- User can review and adjust the discriminator criteria

### 5. Result Filtering
- Each search result is evaluated against the semantic discriminator
- LLM provides Yes/No decision with optional confidence score
- Results can be processed in parallel for efficiency

### 6. Result Presentation
- Filtered results are displayed with relevance indicators
- Users can view filtering rationale for each article
- Results can be saved to article groups for further analysis

## Technical Architecture

### Frontend Components

```typescript
// Main container component
SmartSearchLab/
├── QueryRefinementPanel.tsx       // Steps 1-2: Query input and refinement
├── KeywordGenerationPanel.tsx     // Step 3: Keyword extraction and editing
├── SearchProgressPanel.tsx        // Step 4: Real-time search progress
├── SemanticDiscriminatorPanel.tsx // Step 5: Discriminator configuration
├── ResultsFilteringPanel.tsx      // Step 6: Filtering progress
└── FilteredResultsPanel.tsx       // Step 7: Final results display
```

### Data Flow Architecture

```
User Input → Query Refinement → Keyword Generation → Search API
                                                          ↓
                                                    Raw Results
                                                          ↓
                                            Semantic Discriminator
                                                          ↓
                                                 Parallel Filtering
                                                          ↓
                                                  Filtered Results
```

## API Endpoints

### 1. Query Refinement
```typescript
POST /api/lab/smart-search/refine-query
Request: {
  original_query: string;
  context?: {
    therapeutic_area?: string;
    study_type?: string;
    population?: string;
  };
}
Response: {
  refined_query: string;
  improvements: string[];
  confidence: number;
}
```

### 2. Keyword Generation
```typescript
POST /api/lab/smart-search/generate-keywords
Request: {
  refined_query: string;
  categories_requested?: string[];
}
Response: {
  keywords: {
    primary: string[];
    medical_conditions: string[];
    interventions: string[];
    outcomes: string[];
    additional: string[];
  };
  search_strings: {
    pubmed: string;
    google_scholar: string;
  };
}
```

### 3. Execute Search
```typescript
POST /api/lab/smart-search/execute
Request: {
  keywords: KeywordSet;
  search_engines: string[];
  max_results?: number;
}
Response: {
  search_id: string;
  status: 'in_progress' | 'completed';
  total_results: number;
  results: SearchResult[];
}
```

### 4. Generate Discriminator
```typescript
POST /api/lab/smart-search/generate-discriminator
Request: {
  refined_query: string;
  keywords: KeywordSet;
  strictness: 'low' | 'medium' | 'high';
}
Response: {
  discriminator_prompt: string;
  evaluation_criteria: string[];
  examples: {
    positive: string;
    negative: string;
  };
}
```

### 5. Filter Results
```typescript
POST /api/lab/smart-search/filter
Request: {
  search_id: string;
  discriminator_prompt: string;
  batch_size?: number;
}
Response: {
  filter_id: string;
  status: 'in_progress' | 'completed';
  progress: {
    total: number;
    processed: number;
    accepted: number;
    rejected: number;
  };
}

// WebSocket endpoint for real-time updates
WS /api/lab/smart-search/filter/{filter_id}/stream
```

### 6. Get Filtered Results
```typescript
GET /api/lab/smart-search/results/{filter_id}
Response: {
  results: Array<{
    article: SearchResult;
    passed_filter: boolean;
    confidence: number;
    reasoning?: string;
  }>;
  statistics: {
    total_evaluated: number;
    passed: number;
    failed: number;
    average_confidence: number;
  };
}
```

## TypeScript Interfaces

```typescript
// types/smart-search.ts

export interface SmartSearchSession {
  id: string;
  created_at: string;
  original_query: string;
  refined_query?: string;
  keywords?: KeywordSet;
  discriminator?: SemanticDiscriminator;
  search_results?: SearchResults;
  filtered_results?: FilteredResults;
  status: SmartSearchStatus;
}

export interface KeywordSet {
  primary: string[];
  medical_conditions: string[];
  interventions: string[];
  outcomes: string[];
  additional: string[];
}

export interface SemanticDiscriminator {
  prompt: string;
  criteria: string[];
  strictness: 'low' | 'medium' | 'high';
  examples?: {
    positive: string;
    negative: string;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  source: 'pubmed' | 'google_scholar' | 'other';
}

export interface FilteredResult {
  article: SearchResult;
  passed_filter: boolean;
  confidence: number;
  reasoning?: string;
  evaluated_at: string;
}

export interface FilteringProgress {
  total: number;
  processed: number;
  accepted: number;
  rejected: number;
  percentage: number;
}

export type SmartSearchStatus = 
  | 'draft'
  | 'refining_query'
  | 'generating_keywords'
  | 'searching'
  | 'generating_discriminator'
  | 'filtering'
  | 'completed'
  | 'error';
```

## UI Components Design

### 1. Query Refinement Panel
```tsx
interface QueryRefinementPanelProps {
  onQuerySubmit: (query: string) => void;
  onRefinementAccept: (refined: string) => void;
}

// Features:
// - Large text input for research question
// - "Refine Query" button
// - Side-by-side comparison of original vs refined
// - Accept/Edit/Reject buttons for refinement
// - Improvement suggestions list
```

### 2. Keyword Generation Panel
```tsx
interface KeywordGenerationPanelProps {
  query: string;
  onKeywordsGenerated: (keywords: KeywordSet) => void;
}

// Features:
// - Categorized keyword display (chips/tags)
// - Add/remove keywords functionality
// - Keyword category management
// - Preview of search strings for each engine
// - "Proceed to Search" button
```

### 3. Semantic Discriminator Panel
```tsx
interface SemanticDiscriminatorPanelProps {
  query: string;
  keywords: KeywordSet;
  onDiscriminatorSet: (discriminator: SemanticDiscriminator) => void;
}

// Features:
// - Display generated discriminator prompt
// - Strictness level selector
// - Evaluation criteria checklist
// - Example positive/negative cases
// - Edit capability for fine-tuning
```

### 4. Results Filtering Panel
```tsx
interface ResultsFilteringPanelProps {
  results: SearchResult[];
  discriminator: SemanticDiscriminator;
  onFilteringComplete: (filtered: FilteredResult[]) => void;
}

// Features:
// - Real-time progress bar
// - Live statistics (accepted/rejected/pending)
// - Pause/Resume capability
// - Batch size configuration
// - Preview of articles being processed
```

### 5. Filtered Results Panel
```tsx
interface FilteredResultsPanelProps {
  results: FilteredResult[];
  onSaveToGroup: (articleIds: string[]) => void;
}

// Features:
// - Sortable table/card view
// - Confidence score indicators
// - Expand to view reasoning
// - Bulk selection for saving
// - Export capabilities
// - Manual override (accept/reject)
```

## State Management

```typescript
// stores/smartSearchStore.ts
interface SmartSearchStore {
  // State
  currentSession: SmartSearchSession | null;
  sessions: SmartSearchSession[];
  isProcessing: boolean;
  currentStep: number;
  
  // Actions
  createSession: (query: string) => Promise<void>;
  refineQuery: (sessionId: string) => Promise<void>;
  generateKeywords: (sessionId: string) => Promise<void>;
  executeSearch: (sessionId: string) => Promise<void>;
  generateDiscriminator: (sessionId: string) => Promise<void>;
  filterResults: (sessionId: string) => Promise<void>;
  
  // Mutations
  updateKeywords: (keywords: KeywordSet) => void;
  updateDiscriminator: (discriminator: SemanticDiscriminator) => void;
  overrideFilterDecision: (resultId: string, decision: boolean) => void;
}
```

## User Experience Considerations

### Progressive Disclosure
- Each step builds on the previous one
- Users can go back to modify earlier steps
- Clear visual indicators of current progress

### Transparency
- Show LLM reasoning at each step
- Allow manual overrides at every stage
- Provide confidence scores and explanations

### Performance
- Parallel processing where possible
- WebSocket connections for real-time updates
- Caching of intermediate results
- Batch processing options

### Persistence
- Save search sessions for later review
- Export functionality for results
- Integration with existing article groups
- Search history and templates

## Integration Points

### With Existing Systems
1. **Article Groups**: Save filtered results directly to groups
2. **Feature Extraction**: Apply extraction to filtered results
3. **Canonical Studies**: Generate canonical representations
4. **Company Profiles**: Use profile context for query refinement

### External Services
1. **PubMed API**: Direct search integration
2. **Google Scholar**: Web scraping or API if available
3. **CrossRef**: DOI resolution and metadata
4. **Semantic Scholar**: Additional search source

## Error Handling

### Graceful Degradation
- If refinement fails, allow proceeding with original query
- If keyword generation fails, allow manual input
- If filtering fails for some articles, show partial results
- Network failures trigger automatic retries

### User Feedback
- Clear error messages with actionable steps
- Progress indicators for long-running operations
- Ability to cancel and restart at any step
- Save partial progress automatically

## Performance Metrics

### Track and Display
- Query refinement improvement score
- Keyword relevance score
- Search coverage (% of relevant articles found)
- Filtering precision and recall
- Time per step
- User satisfaction metrics

## Security Considerations

### API Security
- Rate limiting on LLM calls
- Input validation and sanitization
- Secure storage of search sessions
- User authentication and authorization

### Data Privacy
- No storage of sensitive medical information
- Anonymous usage analytics only
- Secure handling of API keys
- CORS configuration for API endpoints

## Implementation Phases

### Phase 1: Core Workflow (MVP)
- Basic query refinement
- Simple keyword generation
- PubMed search integration
- Basic semantic filtering
- Simple results display

### Phase 2: Enhanced Features
- Multiple search engines
- Advanced discriminator configuration
- Real-time filtering with WebSockets
- Batch processing options
- Search session management

### Phase 3: Advanced Integration
- Integration with article groups
- Feature extraction on results
- Search templates and history
- Advanced analytics and metrics
- Export and reporting features

## Testing Strategy

### Unit Tests
- Component logic testing
- API endpoint testing
- State management testing
- Utility function testing

### Integration Tests
- Full workflow testing
- API integration testing
- WebSocket connection testing
- Error scenario testing

### E2E Tests
- Complete user journey
- Multi-step workflow
- Error recovery flows
- Performance testing

## Documentation Requirements

### User Documentation
- Step-by-step guide
- Best practices for query formulation
- Understanding discriminator configuration
- Interpreting results and confidence scores

### Developer Documentation
- API documentation
- Component architecture
- State management patterns
- Extension points for customization