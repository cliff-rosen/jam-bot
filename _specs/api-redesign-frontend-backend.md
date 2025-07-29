# API Redesign: Frontend & Backend Architecture

## Current Problems

### 🚨 **Critical Issues**
1. **Misplaced API**: `tabelizerApi.ts` in `/components/features/tabelizer/api/` instead of `/lib/api/`
2. **Inconsistent HTTP clients**: Mix of shared `api`, raw `axios`, and custom stream utils
3. **Fragmented types**: Types scattered across `/types/`, `/components/features/*/types.ts`, and inline in APIs
4. **Duplicate type definitions**: Multiple article types, column types with different shapes
5. **Missing exports**: Main API index doesn't export newer APIs
6. **Backend router confusion**: `tabelizer.py` handles both column extraction AND group management

### 📊 **Current Structure Analysis**

#### Frontend APIs (Current Mess):
```
❌ components/features/tabelizer/api/tabelizerApi.ts    # Wrong location
✅ lib/api/articleGroupApi.ts                          # Correct location
✅ lib/api/articleWorkbenchApi.ts                      # Correct location  
✅ lib/api/articleChatApi.ts                           # Correct location
```

#### HTTP Client Usage:
```
✅ articleGroupApi.ts    → uses shared `api` client
❌ articleWorkbenchApi.ts → uses raw `axios` + manual tokens  
✅ tabelizerApi.ts       → uses shared `api` client
✅ articleChatApi.ts     → uses custom streaming (appropriate)
```

#### Type Definitions (Scattered):
```
❌ components/features/tabelizer/types.ts         # Should be centralized
❌ components/features/tabelizer/chat/types.ts    # Should be centralized  
❌ lib/api/articleGroupApi.ts                     # Inline types
❌ lib/api/articleWorkbenchApi.ts                 # Inline types
✅ types/unifiedSearch.ts                         # Good centralization
```

## 🎯 **Redesigned Architecture**

### Backend Router Structure

**4 Total Routers:**

#### 1. `article_analysis.py` → `/api/articles/analysis/`
```python
# Extracted from current tabelizer.py
# Handles bulk column extraction operations
router = APIRouter(prefix="/articles/analysis", tags=["article-analysis"])

@router.post("/extract-column")              # Single column extraction
@router.post("/extract-multiple-columns")    # Bulk column extraction  
@router.get("/presets")                      # Analysis presets
@router.post("/export")                      # Export operations
```

#### 2. `article_groups.py` → `/api/articles/groups/`
```python
# Extracted from current tabelizer.py  
# Handles article collection CRUD
router = APIRouter(prefix="/articles/groups", tags=["article-groups"])

# Core CRUD
@router.get("/")                          # List user's groups
@router.post("/")                         # Create new group
@router.get("/{group_id}")                # Get group details
@router.put("/{group_id}")                # Update group metadata
@router.delete("/{group_id}")             # Delete group

# Article management
@router.post("/{group_id}/articles")      # Add articles to group
@router.put("/{group_id}/articles")       # Replace all articles

# Convenience endpoints (keep existing functionality)
@router.post("/{group_id}/save")          # Save tabelizer state to existing group
@router.post("/{group_id}/add")           # Add articles to existing group (alias)
@router.post("/create-and-save")          # Create group and save articles in one call
```

#### 3. `article_workbench.py` → `/api/workbench/` 
```python
# Enhanced version of current article_workbench.py
# Handles individual article research
router = APIRouter(prefix="/workbench", tags=["workbench"])

# Keep existing endpoints (no breaking changes)
@router.get("/groups/{group_id}/articles/{article_id}")              # Get workbench data  
@router.put("/groups/{group_id}/articles/{article_id}/notes")        # Update notes
@router.put("/groups/{group_id}/articles/{article_id}/metadata")     # Update metadata
@router.post("/groups/{group_id}/articles/{article_id}/extract-feature")    # Extract single feature
@router.put("/groups/{group_id}/articles/{article_id}/features")     # Update features
@router.delete("/groups/{group_id}/articles/{article_id}/features/{feature_name}") # Delete feature

# Add new batch endpoints
@router.post("/groups/{group_id}/batch/features")          # Batch extract features
@router.put("/groups/{group_id}/batch/metadata")           # Batch update metadata
```

#### 4. `article_chat.py` → `/api/chat/article/`
```python
# Keep existing article_chat.py unchanged
router = APIRouter(prefix="/chat/article", tags=["article-chat"])

@router.post("/stream")                   # Stream chat about article
```

**Main.py includes:**
```python
app.include_router(article_analysis.router, prefix="/api")    # /api/articles/analysis
app.include_router(article_groups.router, prefix="/api")      # /api/articles/groups  
app.include_router(article_workbench.router, prefix="/api")   # /api/workbench (no change)
app.include_router(article_chat.router, prefix="/api")        # /api/chat/article (no change)
```

### Frontend API Structure

```typescript
// lib/api/index.ts - Central export
export { articleAnalysisApi } from './articleAnalysisApi';
export { articleGroupApi } from './articleGroupApi'; 
export { articleWorkbenchApi } from './articleWorkbenchApi';
export { articleChatApi } from './articleChatApi';
export { api } from './client';

// All APIs use shared client and consistent patterns
```

### Type Organization

```typescript
// types/ - Core business entities (domain models)
types/
├── articles.ts           # CanonicalResearchArticle (single source)
├── articleGroups.ts      # ArticleGroup, ArticleGroupDetail (business entities)
├── workbench.ts         # WorkbenchData, ExtractedFeature (business entities)
├── analysis.ts          # ColumnDefinition, AnalysisPreset (business entities)
├── search.ts            # Search-related types
└── user.ts              # User types

// types/api/ - Pure API request/response types (DTOs)
types/api/
├── requests.ts          # API request DTOs
├── responses.ts         # API response DTOs  
├── pagination.ts        # Pagination helpers
└── errors.ts            # Error response types
```

**Key Distinction:**
- **Business entities** (`/types/`) represent core domain concepts that exist independently of how they're transmitted over APIs
- **API types** (`/types/api/`) are pure data transfer objects for request/response serialization
- APIs should accept and return business entities, not custom API-specific types
- This follows Domain-Driven Design principles where the domain model is separate from the API layer

## 📋 **Detailed API Specifications**

### 1. Article Analysis API

#### `POST /api/articles/analysis/extract-column`
Extract a single custom column across multiple articles.

**Request:**
```typescript
interface ExtractColumnRequest {
  articles: ArticleSummary[];
  column: ColumnDefinition;
}

interface ArticleSummary {
  id: string;
  title: string;
  abstract: string;
}

interface ColumnDefinition {
  name: string;
  description: string;
  type: 'boolean' | 'text' | 'score' | 'number';
  options?: {
    min?: number;
    max?: number;  
    step?: number;
    choices?: string[];
  };
}
```

**Response:**
```typescript
interface ExtractColumnResponse {
  column_name: string;
  results: Record<string, ColumnValue>; // articleId -> value
  metadata: {
    extraction_time: string;
    model_used: string;
    confidence_scores?: Record<string, number>;
  };
}

type ColumnValue = string | number | boolean;
```

#### `POST /api/articles/analysis/extract-multiple-columns`
Extract multiple columns in a single operation (more efficient).

**Request:**
```typescript
interface ExtractMultipleColumnsRequest {
  articles: ArticleSummary[];
  columns: Record<string, ColumnDefinition>; // columnName -> definition
}
```

**Response:**
```typescript
interface ExtractMultipleColumnsResponse {
  results: Record<string, Record<string, ColumnValue>>; // articleId -> columnName -> value
  metadata: {
    extraction_time: string;
    model_used: string;
    column_confidence?: Record<string, Record<string, number>>;
  };
}
```

#### `GET /api/articles/analysis/presets`
Get predefined column extraction presets.

**Response:**
```typescript
interface AnalysisPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  columns: Record<string, ColumnDefinition>;
  created_at: string;
  usage_count: number;
}

interface AnalysisPresetsResponse {
  presets: AnalysisPreset[];
  categories: string[];
}
```

### 2. Article Groups API

#### `GET /api/articles/groups/`
List user's article groups.

**Query Parameters:**
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)
- `search?: string` - Search in group names/descriptions
- `sort?: 'name' | 'created_at' | 'updated_at' | 'article_count'`
- `order?: 'asc' | 'desc'`

**Response:**
```typescript
interface ArticleGroupsListResponse {
  groups: ArticleGroupSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ArticleGroupSummary {
  id: string;
  name: string;
  description?: string;
  article_count: number;
  created_at: string;
  updated_at: string;
  preview_articles: ArticlePreview[]; // First 3 articles
}

interface ArticlePreview {
  id: string;
  title: string;
  journal?: string;
  publication_year?: number;
}
```

#### `POST /api/articles/groups/`
Create a new article group.

**Request:**
```typescript
interface CreateArticleGroupRequest {
  name: string;
  description?: string;
  articles?: CanonicalResearchArticle[];
  columns?: ColumnMetadata[];
  search_context?: {
    query: string;
    provider: string;
    parameters: Record<string, any>;
  };
}

interface ColumnMetadata {
  name: string;
  description: string;
  type: 'boolean' | 'text' | 'score' | 'number';
  options?: ColumnDefinition['options'];
  is_extracted: boolean;
  extraction_method?: 'ai' | 'manual' | 'computed';
}
```

**Response:**
```typescript
interface ArticleGroupResponse {
  group: ArticleGroupDetail;
  message: string;
}

interface ArticleGroupDetail {
  id: string;
  name: string;
  description?: string;
  article_count: number;
  columns: ColumnMetadata[];
  search_context?: {
    query: string;
    provider: string;
    parameters: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
  articles: ArticleGroupItem[];
}

interface ArticleGroupItem {
  article: CanonicalResearchArticle;
  position: number;
  column_data: Record<string, ColumnValue>;
  workbench_summary: {
    has_notes: boolean;
    feature_count: number;
    tags: string[];
    rating?: number;
  };
}
```

#### `GET /api/articles/groups/{groupId}`
Get detailed group information with all articles.

**Response:** `ArticleGroupResponse`

#### `PUT /api/articles/groups/{groupId}`
Update group metadata (name, description, columns).

**Request:**
```typescript
interface UpdateArticleGroupRequest {
  name?: string;
  description?: string;
  columns?: ColumnMetadata[];
}
```

**Response:** `ArticleGroupResponse`

#### `DELETE /api/articles/groups/{groupId}`
Delete an article group and all associated data.

**Response:**
```typescript
interface DeleteGroupResponse {
  message: string;
  deleted_group_id: string;
  deleted_articles_count: number;
}
```

#### `POST /api/articles/groups/{groupId}/articles`
Add articles to existing group.

**Request:**
```typescript
interface AddArticlesToGroupRequest {
  articles: CanonicalResearchArticle[];
  extract_columns?: boolean; // Auto-extract existing columns for new articles
}
```

**Response:** `ArticleGroupResponse`

#### `PUT /api/articles/groups/{groupId}/articles`
Replace all articles in group.

**Request:**
```typescript
interface ReplaceGroupArticlesRequest {
  articles: CanonicalResearchArticle[];
  preserve_workbench_data?: boolean; // Keep notes/features for matching articles
}
```

**Response:** `ArticleGroupResponse`

### 3. Article Workbench API

#### `GET /api/articles/workbench/{groupId}/{articleId}`
Get complete workbench data for an article.

**Response:**
```typescript
interface WorkbenchDataResponse {
  article: CanonicalResearchArticle;
  workbench: {
    notes: string;
    features: Record<string, ExtractedFeature>;
    metadata: WorkbenchMetadata;
    position: number;
    created_at: string;
    updated_at?: string;
  };
  group_context: {
    group_id: string;
    group_name: string;
    total_articles: number;
  };
}

interface ExtractedFeature {
  value: ColumnValue;
  type: 'boolean' | 'text' | 'score' | 'number';
  extraction_method: 'ai' | 'manual';
  extraction_prompt?: string;
  confidence_score?: number;
  extracted_at: string;
  extracted_by?: string;
}

interface WorkbenchMetadata {
  tags: string[];
  rating?: number; // 1-5 stars
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'reading' | 'read' | 'reviewed' | 'archived';
  custom_fields?: Record<string, any>;
}
```

#### `PUT /api/articles/workbench/{groupId}/{articleId}/notes`
Update research notes for an article.

**Request:**
```typescript
interface UpdateNotesRequest {
  notes: string;
}
```

**Response:**
```typescript
interface UpdateNotesResponse {
  notes: string;
  updated_at: string;
}
```

#### `PUT /api/articles/workbench/{groupId}/{articleId}/metadata`
Update workbench metadata for an article.

**Request:**
```typescript
interface UpdateMetadataRequest {
  metadata: Partial<WorkbenchMetadata>;
}
```

**Response:**
```typescript
interface UpdateMetadataResponse {
  metadata: WorkbenchMetadata;
  updated_at: string;
}
```

#### `POST /api/articles/workbench/{groupId}/{articleId}/features`
Extract a single feature using AI.

**Request:**
```typescript
interface ExtractFeatureRequest {
  feature_name: string;
  feature_type: 'boolean' | 'text' | 'score' | 'number';
  extraction_prompt: string;
  options?: ColumnDefinition['options'];
}
```

**Response:**
```typescript
interface ExtractFeatureResponse {
  feature_name: string;
  feature: ExtractedFeature;
  updated_at: string;
}
```

#### `PUT /api/articles/workbench/{groupId}/{articleId}/features`
Update or add multiple features.

**Request:**
```typescript
interface UpdateFeaturesRequest {
  features: Record<string, Partial<ExtractedFeature>>;
}
```

**Response:**
```typescript
interface UpdateFeaturesResponse {
  features: Record<string, ExtractedFeature>;
  updated_at: string;
}
```

#### `DELETE /api/articles/workbench/{groupId}/{articleId}/features/{featureName}`
Delete a specific feature.

**Response:**
```typescript
interface DeleteFeatureResponse {
  message: string;
  deleted_feature: string;
}
```

#### `POST /api/articles/workbench/{groupId}/batch/features`
Extract features for multiple articles in a group.

**Request:**
```typescript
interface BatchExtractFeaturesRequest {
  article_ids: string[];
  feature_name: string;
  feature_type: 'boolean' | 'text' | 'score' | 'number';
  extraction_prompt: string;
  options?: ColumnDefinition['options'];
}
```

**Response:**
```typescript
interface BatchExtractFeaturesResponse {
  results: Record<string, ExtractedFeature>; // articleId -> feature
  failures: Record<string, string>; // articleId -> error message
  summary: {
    total_requested: number;
    successful: number;
    failed: number;
  };
}
```

### 4. Article Chat API

#### `POST /api/chat/article/stream`
Stream a conversation about an article.

**Request:**
```typescript
interface ArticleChatRequest {
  message: string;
  article: CanonicalResearchArticle;
  conversation_history?: ChatMessage[];
  context?: {
    company_focus?: string;
    analysis_goals?: string[];
    user_expertise_level?: 'beginner' | 'intermediate' | 'expert';
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

**Response:** Server-sent events stream
```typescript
interface ChatStreamEvent {
  type: 'chunk' | 'complete' | 'error';
  data: string;
  metadata?: {
    model_used: string;
    response_time_ms?: number;
    token_count?: number;
  };
}
```

## 🔧 **Implementation Plan**

### Phase 1: Backend Restructuring
1. **Split `tabelizer.py`** into:
   - `article_analysis.py` - Column extraction endpoints
   - `article_groups.py` - Group CRUD endpoints  
2. **Enhance `article_workbench.py`** with batch operations
3. **Update database schema** to separate analysis vs workbench features
4. **Update `main.py`** router includes

### Phase 2: Frontend API Cleanup  
1. **Move `tabelizerApi.ts`** to `/lib/api/articleAnalysisApi.ts`
2. **Refactor `articleWorkbenchApi.ts`** to use shared client
3. **Extract inline types** to `/types/api/` directory
4. **Update `/lib/api/index.ts`** exports
5. **Fix all import paths**

### Phase 3: Type System Cleanup
1. **Consolidate article types** - single `CanonicalResearchArticle` in `/types/articles.ts`
2. **Create business entity types** in `/types/` (articleGroups.ts, workbench.ts, analysis.ts)
3. **Create pure API types** in `/types/api/` (requests.ts, responses.ts)
4. **Remove duplicate type definitions**
5. **Add comprehensive JSDoc documentation**

### Phase 4: Testing & Validation
1. **Update all existing components** to use new APIs
2. **Add comprehensive error handling**
3. **Test all endpoints** with proper authentication
4. **Validate type safety** across the stack

This redesign creates a clean, maintainable architecture with clear separation of concerns and consistent patterns throughout the entire stack.