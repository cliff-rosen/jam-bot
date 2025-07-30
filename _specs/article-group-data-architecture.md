# Article-Group Data Architecture Specification

## Overview

This document defines the complete data architecture for articles and groups, from database models through frontend state management. The core principle is **contextual feature ownership**: extracted features belong to article-group relationships, not to articles globally.

## Core Design Principles

1. **Clean Article Separation**: Articles contain only canonical bibliographic data
2. **Contextual Features**: Extracted features are specific to article-group relationships  
3. **Single Source of Truth**: Each piece of data has one authoritative location
4. **Consistent Naming**: Same entity names across database, API, and frontend
5. **Clear Data Flow**: Explicit patterns for search vs. group operations

## Database Models

### extracted_features Record Semantics

The `extracted_features` field is a JSONB column that stores key-value pairs where:
- **Key**: Column ID (string) - matches `ColumnDefinition.id` (NOT name, which can change)
- **Value**: Extracted value (any type) - conforms to `ColumnDefinition.type`

#### Structure
```json
{
  "column_id_uuid_1": extracted_value,
  "column_id_uuid_2": another_value
}
```

#### Example: Research Paper Analysis Group
```json
{
  "col_f47ac10b-58cc-4372-a567-0e02b2c3d479": "yes",
  "col_6ba7b810-9dad-11d1-80b4-00c04fd430c8": "systematic review", 
  "col_6ba7b811-9dad-11d1-80b4-00c04fd430c8": "no",
  "col_f47ac10c-58cc-4372-a567-0e02b2c3d479": "156",
  "col_550e8400-e29b-41d4-a716-446655440000": "7.5"
}
```

#### Value Type Mapping
| ColumnDefinition.type | Example Value | Validation Rules |
|----------------------|---------------|------------------|
| `'boolean'` | `"yes"` or `"no"` | Must be exactly "yes" or "no" (string) |
| `'text'` | `"systematic review"` | String, max 100 chars, descriptive |
| `'score'` | `"7.5"` | Numeric string within min/max range |

#### Key Constraints
1. **Keys must exist in group.column_definitions**: Every key in extracted_features must match a ColumnDefinition.id
2. **Values must match type**: Boolean columns store "yes"/"no", scores store numeric strings
3. **Complete coverage**: All columns defined in group should have values (use defaults for missing)
4. **Immutable after extraction**: Values don't change unless re-extracted
5. **Group-scoped**: Same article can have different features in different groups
6. **ID-based mapping**: Never rely on column names for mapping, always use stable column IDs

#### Lifecycle
```
Group Creation → extracted_features: {} (empty)
    ↓
Feature Extraction → extracted_features: {"col1": "value1", ...}
    ↓  
Re-extraction → extracted_features: {"col1": "new_value1", ...} (replaces)
```

#### Real-World Example
For a research paper titled "Machine Learning in Healthcare: A Systematic Review":

**Group**: "Healthcare AI Papers"
**Column Definitions**:
- ID: `col_f47ac10b-58cc-4372-a567-0e02b2c3d479`, Name: `has_methodology_section` (boolean)
- ID: `col_6ba7b810-9dad-11d1-80b4-00c04fd430c8`, Name: `primary_research_method` (text)
- ID: `col_f47ac10c-58cc-4372-a567-0e02b2c3d479`, Name: `sample_size` (text)
- ID: `col_550e8400-e29b-41d4-a716-446655440000`, Name: `clinical_validation` (boolean)
- ID: `col_6ba7b811-9dad-11d1-80b4-00c04fd430c8`, Name: `novelty_score` (score, 1-10)

**Extracted Features**:
```json
{
  "col_f47ac10b-58cc-4372-a567-0e02b2c3d479": "yes",
  "col_6ba7b810-9dad-11d1-80b4-00c04fd430c8": "systematic review and meta-analysis",
  "col_f47ac10c-58cc-4372-a567-0e02b2c3d479": "47 studies analyzed",
  "col_550e8400-e29b-41d4-a716-446655440000": "no", 
  "col_6ba7b811-9dad-11d1-80b4-00c04fd430c8": "6.5"
}
```

**Same article in different group**:
**Group**: "Meta-Analysis Papers"
**Column Definitions**:
- ID: `col_123e4567-e89b-12d3-a456-426614174000`, Name: `study_count` (text)
- ID: `col_987fcdeb-51a2-43d7-8f9e-123456789abc`, Name: `quality_assessment` (boolean)
- ID: `col_456789ab-cdef-1234-5678-90abcdef1234`, Name: `heterogeneity_reported` (boolean)

**Extracted Features**:
```json
{
  "col_123e4567-e89b-12d3-a456-426614174000": "47",
  "col_987fcdeb-51a2-43d7-8f9e-123456789abc": "yes",
  "col_456789ab-cdef-1234-5678-90abcdef1234": "yes"
}
```

This demonstrates how the same article has completely different contextual features depending on which analytical group it belongs to.

### Core Tables

```sql
-- Canonical articles (bibliographic data only)
CREATE TABLE articles (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors JSONB,
    publication_year INTEGER,
    doi TEXT,
    arxiv_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    -- NO extracted_features column
);

-- Article groups (analytical collections)
CREATE TABLE article_groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    column_definitions JSONB NOT NULL DEFAULT '[]', -- ColumnDefinition[]
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction table: articles within groups (with contextual features)
CREATE TABLE article_group_details (
    id UUID PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES article_groups(id) ON DELETE CASCADE,
    extracted_features JSONB DEFAULT '{}', -- Group-specific features
    position INTEGER, -- Order within group
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(article_id, group_id)
);
```

### Data Ownership Rules

| Data Type | Owner | Storage Location | Scope |
|-----------|-------|------------------|-------|
| Bibliographic data | Article | `articles` table | Global |
| Column definitions | Group | `article_groups.column_definitions` | Group-specific |
| Extracted features | Article-Group relationship | `article_group_details.extracted_features` | Contextual |
| Article ordering | Group context | `article_group_details.position` | Group-specific |

## Backend Models (Python/Pydantic)

### Base Models

```python
class CanonicalResearchArticle(BaseModel):
    """Clean article with only bibliographic data"""
    id: str
    title: str
    abstract: Optional[str] = None
    authors: List[str] = []
    publication_year: Optional[int] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # NO extracted_features field

class ColumnDefinition(BaseModel):
    """Definition of an extractable feature"""
    id: str  # Stable UUID for mapping extracted_features
    name: str  # Display name (can change)
    description: str
    type: Literal['boolean', 'text', 'score']
    options: Optional[Dict[str, Any]] = {}

class ArticleGroupDetail(BaseModel):
    """Junction model: article within a group context"""
    id: str
    article_id: str
    group_id: str
    article: CanonicalResearchArticle  # Embedded clean article
    extracted_features: Dict[str, Any] = {}  # Group-specific features
    position: Optional[int] = None
    added_at: str

class ArticleGroup(BaseModel):
    """Complete group with articles and their contextual features"""
    id: str
    name: str
    description: Optional[str] = None
    column_definitions: List[ColumnDefinition] = []
    articles: List[ArticleGroupDetail] = []  # Articles with group context
    user_id: str
    created_at: str
    updated_at: str
```

## API Contracts

### Search Operations
```python
# GET /api/search/articles
class SearchResponse(BaseModel):
    articles: List[CanonicalResearchArticle]  # Clean articles only
    metadata: SearchMetadata
    
# POST /api/search/articles  
class SearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 20
```

### Group Operations
```python
# GET /api/workbench/groups/{group_id}
class GroupDetailResponse(BaseModel):
    group: ArticleGroup  # Includes articles with contextual features

# POST /api/workbench/groups
class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    article_ids: List[str]  # From search results
    
# POST /api/workbench/extract
class ExtractRequest(BaseModel):
    group_id: str
    columns: List[ColumnDefinition]
    
class ExtractResponse(BaseModel):
    updated_articles: List[ArticleGroupDetail]  # With new features
```

## Frontend Data Architecture

### Unified Collection Model

**Core Insight**: A search result IS a group - both are containers for articles with metadata and decorators (columns/features).

Instead of separate `searchResults` and `currentGroup` state, we use a unified `ArticleCollection` model that can represent:
- **Search collections**: Articles from search with search metadata  
- **Saved groups**: Persisted articles with extracted features
- **Modified collections**: Groups that have been edited/filtered

```typescript
enum CollectionSource {
  SEARCH = 'search',        // From search API
  SAVED_GROUP = 'saved',    // From saved group API  
  MODIFIED = 'modified'     // Edited/filtered from original
}

interface ArticleCollection {
  // Identity
  id: string;                                    // UUID for all collections
  source: CollectionSource;                      // How this collection was created
  name: string;                                  // Display name
  
  // Articles with contextual data
  articles: ArticleGroupDetail[];                // Always wrapped, may have empty features
  
  // Column/feature definitions
  column_definitions: ColumnDefinition[];        // What features this collection extracts
  
  // Source metadata
  search_params?: SearchParams;                  // If source=SEARCH
  saved_group_id?: string;                       // If source=SAVED_GROUP  
  parent_collection_id?: string;                 // If source=MODIFIED
  
  // State
  is_saved: boolean;                            // Whether persisted to backend
  is_modified: boolean;                         // Whether changed since load/create
  created_at: string;
  updated_at: string;
}

interface SearchParams {
  query: string;
  filters: Record<string, any>;
  page: number;
  page_size: number;
}
```

#### Collection Creation Patterns

**1. Search Collection**
```typescript
// User performs search
const searchResponse = await searchArticles(query, params);

// Create collection from search results
const searchCollection: ArticleCollection = {
  id: generateUUID(),
  source: CollectionSource.SEARCH,
  name: `Search: "${query}"`,
  articles: searchResponse.articles.map(article => ({
    id: generateUUID(),
    article_id: article.id,
    group_id: '', // Not persisted yet
    article: article,
    extracted_features: {}, // Empty initially
    added_at: new Date().toISOString()
  })),
  column_definitions: [], // No features yet
  search_params: params,
  is_saved: false,
  is_modified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**2. Saved Group Collection**  
```typescript
// User loads saved group
const groupResponse = await loadGroup(groupId);

// Already comes as complete collection
const savedCollection: ArticleCollection = {
  id: groupResponse.group.id,
  source: CollectionSource.SAVED_GROUP,
  name: groupResponse.group.name,
  articles: groupResponse.group.articles, // Has extracted_features
  column_definitions: groupResponse.group.column_definitions,
  saved_group_id: groupResponse.group.id,
  is_saved: true,
  is_modified: false,
  created_at: groupResponse.group.created_at,
  updated_at: groupResponse.group.updated_at
};
```

**3. Modified Collection**
```typescript
// User filters/edits existing collection
const modifiedCollection: ArticleCollection = {
  ...originalCollection,
  id: generateUUID(), // New ID for modified version
  source: CollectionSource.MODIFIED,
  name: `${originalCollection.name} (filtered)`,
  articles: filteredArticles,
  parent_collection_id: originalCollection.id,
  is_saved: false,
  is_modified: true,
  updated_at: new Date().toISOString()
};
```

#### Unified Frontend State

```typescript
interface WorkbenchState {
  // SINGLE COLLECTION STATE
  currentCollection: ArticleCollection | null;   // The active collection
  collectionLoading: boolean;
  
  // UI STATE  
  selectedArticleIds: Set<string>;               // For operations on articles
  
  // NO separate search/group state
  // NO data duplication
}
```

#### Collection Operations & State Transitions

**1. Search → Collection**
```typescript
async function performSearch(query: string, params: SearchParams) {
  const searchResponse = await searchArticles(query, params);
  
  const collection: ArticleCollection = {
    id: generateUUID(),
    source: CollectionSource.SEARCH,
    name: `Search: "${query}"`,
    articles: searchResponse.articles.map(article => ({
      id: generateUUID(),
      article_id: article.id,
      group_id: '',
      article: article,
      extracted_features: {},
      added_at: new Date().toISOString()
    })),
    column_definitions: [],
    search_params: params,
    is_saved: false,
    is_modified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  setCurrentCollection(collection);
}
```

**2. Collection → Save as Group**
```typescript
async function saveCollection(collection: ArticleCollection, name: string) {
  const articleIds = collection.articles.map(a => a.article_id);
  const savedGroup = await createGroup(name, articleIds, collection.column_definitions);
  
  const savedCollection: ArticleCollection = {
    ...collection,
    id: savedGroup.id,
    source: CollectionSource.SAVED_GROUP,
    name: savedGroup.name,
    saved_group_id: savedGroup.id,
    is_saved: true,
    is_modified: false,
    updated_at: savedGroup.updated_at
  };
  
  setCurrentCollection(savedCollection);
}
```

**3. Collection → Extract Features**
```typescript
async function extractFeaturesFromCollection(
  collection: ArticleCollection, 
  columns: ColumnDefinition[]
) {
  // Update column definitions
  const updatedCollection = {
    ...collection,
    column_definitions: [...collection.column_definitions, ...columns],
    is_modified: true,
    updated_at: new Date().toISOString()
  };
  
  // Extract features (same for all collection types)
  const extractResponse = await extractFeatures(
    collection.saved_group_id || 'temp', 
    columns
  );
  
  // Update articles with new features
  updatedCollection.articles = updatedCollection.articles.map(articleDetail => {
    const updatedFeatures = extractResponse.find(r => r.article_id === articleDetail.article_id);
    return {
      ...articleDetail,
      extracted_features: {
        ...articleDetail.extracted_features,
        ...updatedFeatures?.extracted_features
      }
    };
  });
  
  setCurrentCollection(updatedCollection);
}
```

#### Unified Component Data Access

**Single Article Table Component**
```typescript
// Works with ANY collection type
interface ArticleTableProps {
  collection: ArticleCollection;
  onExtractFeatures: (columns: ColumnDefinition[]) => void;
  onSaveCollection: (name: string) => void;
  onModifyCollection: (filter: ArticleFilter) => void;
}

// Displays:
// - Core article columns: title, abstract, authors, etc.
// - Feature columns from: collection.column_definitions
// - Feature values from: collection.articles[].extracted_features[column.id]
// - Collection metadata: source, is_saved, is_modified states
```

**Collection Header Component**
```typescript
interface CollectionHeaderProps {
  collection: ArticleCollection;
}

// Shows context-aware information:
// - Search collections: query, result count, search params
// - Saved groups: group name, save date, modification status  
// - Modified collections: parent collection, filter info
```

#### Unified Table Rendering

```typescript
// Single table component that works with any collection
function renderTableColumns(collection: ArticleCollection) {
  const columns = [
    // Core article columns (always present)
    { id: 'title', header: 'Title', accessorFn: (item: ArticleGroupDetail) => item.article.title },
    { id: 'authors', header: 'Authors', accessorFn: (item: ArticleGroupDetail) => item.article.authors.join(', ') },
    { id: 'year', header: 'Year', accessorFn: (item: ArticleGroupDetail) => item.article.publication_year },
    
    // Feature columns (dynamic based on collection.column_definitions)
    ...collection.column_definitions.map(column => ({
      id: column.id,
      header: column.name,  // Display name
      accessorFn: (item: ArticleGroupDetail) => 
        item.extracted_features[column.id] || getDefaultValue(column.type),
      cell: ({ getValue }) => formatCellValue(getValue(), column.type)
    }))
  ];
  
  return columns;
}

// Works for search collections (no feature columns) and saved groups (with features)
function ArticleTable({ collection }: { collection: ArticleCollection }) {
  const columns = renderTableColumns(collection);
  
  return (
    <div>
      <CollectionHeader collection={collection} />
      <Table 
        data={collection.articles} 
        columns={columns}
        // Show collection-specific actions based on source
        actions={getCollectionActions(collection)}
      />
    </div>
  );
}
```

#### Collection Action Patterns

```typescript
function getCollectionActions(collection: ArticleCollection) {
  const actions = [];
  
  // Always available
  actions.push('extract_features', 'export_csv', 'filter_articles');
  
  // Source-specific actions
  switch (collection.source) {
    case CollectionSource.SEARCH:
      actions.push('save_as_group', 'refine_search');
      break;
      
    case CollectionSource.SAVED_GROUP:
      if (collection.is_modified) {
        actions.push('save_changes', 'revert_changes');
      }
      actions.push('duplicate_group', 'delete_group');
      break;
      
    case CollectionSource.MODIFIED:
      actions.push('save_as_new_group', 'apply_to_parent');
      break;
  }
  
  return actions;
}
```

#### Data Integrity Rules

**Unified Collection Rules**:
1. Every collection MUST have a unique `id` and `source`
2. `articles` array always contains `ArticleGroupDetail[]` (even for search results)
3. `extracted_features` may be empty `{}` but must exist
4. Feature keys MUST match `collection.column_definitions[].id`
5. `is_saved` and `is_modified` flags control available actions

**State Management Rules**:
1. Only one `currentCollection` at a time (no separate search/group state)
2. Collection source determines available operations
3. Feature extraction works the same regardless of source
4. Saving transforms collection source from SEARCH/MODIFIED → SAVED_GROUP

**UI Consistency Rules**:
1. Same table component works for all collection types
2. Feature columns appear when `column_definitions` exist
3. Collection header shows context-appropriate information
4. Actions menu adapts to collection source and state

This unified approach eliminates the artificial distinction between "search results" and "groups" - they're all just collections of articles with different sources and states.

### TypeScript Types

```typescript
// Core types (match backend exactly)
interface CanonicalResearchArticle {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  publication_year?: number;
  doi?: string;
  arxiv_id?: string;
  created_at?: string;
  updated_at?: string;
  // NO extracted_features
}

interface ColumnDefinition {
  id: string;  // Stable UUID for mapping extracted_features
  name: string;  // Display name (can change)
  description: string;
  type: 'boolean' | 'text' | 'score';
  options?: Record<string, any>;
}

interface ArticleGroupDetail {
  id: string;
  article_id: string;
  group_id: string;
  article: CanonicalResearchArticle;
  extracted_features: Record<string, any>;
  position?: number;
  added_at: string;
}

interface ArticleGroup {
  id: string;
  name: string;
  description?: string;
  column_definitions: ColumnDefinition[];
  articles: ArticleGroupDetail[];
  user_id: string;
  created_at: string;
  updated_at: string;
}
```

### State Management

```typescript
// Workbench Context - Single source of truth
interface WorkbenchState {
  // Search state (temporary, clean articles)
  searchResults: CanonicalResearchArticle[];
  searchMetadata: SearchMetadata | null;
  searchLoading: boolean;
  
  // Group state (persistent, articles with contextual features)
  currentGroup: ArticleGroup | null;
  groupLoading: boolean;
  
  // UI state
  selectedArticleIds: Set<string>;
  
  // NO extracted features stored separately
  // NO duplicate article storage
}

// API client methods
interface WorkbenchApi {
  // Search returns clean articles
  searchArticles(query: string, page?: number): Promise<{
    articles: CanonicalResearchArticle[];
    metadata: SearchMetadata;
  }>;
  
  // Group operations work with contextual data
  loadGroup(groupId: string): Promise<ArticleGroup>;
  createGroup(name: string, articleIds: string[]): Promise<ArticleGroup>;
  extractFeatures(groupId: string, columns: ColumnDefinition[]): Promise<ArticleGroup>;
}
```

## Data Flow Patterns

### 1. Search Flow
```
User Search Input
    ↓
Frontend: searchArticles()
    ↓
Backend: Query articles table
    ↓
API Response: CanonicalResearchArticle[]
    ↓
Frontend: Store in searchResults
    ↓
UI: Display clean articles
```

### 2. Group Creation Flow
```
User Selects Articles from Search
    ↓
Frontend: createGroup(name, articleIds)
    ↓
Backend: 
  - Create ArticleGroup record
  - Create ArticleGroupDetail records
  - Return complete group
    ↓
Frontend: Store in currentGroup
    ↓
UI: Display group with articles (no features yet)
```

### 3. Group Loading Flow
```
User Loads Existing Group
    ↓
Frontend: loadGroup(groupId)
    ↓
Backend:
  - Query ArticleGroup
  - Join ArticleGroupDetail + Articles
  - Return complete group with features
    ↓
Frontend: Store in currentGroup
    ↓
UI: Display group with contextual features
```

### 4. Feature Extraction Flow
```
User Defines Columns + Extracts
    ↓
Frontend: extractFeatures(groupId, columns)
    ↓
Backend:
  - Update group.column_definitions
  - Extract features for each article
  - Update article_group_details.extracted_features
  - Return updated group
    ↓
Frontend: Update currentGroup
    ↓
UI: Display articles with new features
```

## Component Data Patterns

### Search Results Component
```typescript
// Receives clean articles from search
interface SearchResultsProps {
  articles: CanonicalResearchArticle[];
  onSelectArticles: (ids: string[]) => void;
}

// NO feature columns shown here
// Articles are selectable for group creation
```

### Group Table Component  
```typescript
// Receives group with contextual features
interface GroupTableProps {
  group: ArticleGroup;
  onExtractFeatures: (columns: ColumnDefinition[]) => void;
}

// Shows articles with their group-specific features
// Feature columns based on group.column_definitions
// Feature data from articles[].extracted_features
```

## Migration Strategy

### Phase 1: Database Schema
- [ ] Remove extracted_features from articles table
- [ ] Ensure article_group_details has extracted_features JSONB column
- [ ] Migrate existing feature data to junction table

### Phase 2: Backend Models
- [ ] Remove extracted_features from CanonicalResearchArticle
- [ ] Ensure ArticleGroupDetail has extracted_features field
- [ ] Update all API endpoints to use correct models

### Phase 3: Frontend Types
- [ ] Remove ArticleGroupItem type completely
- [ ] Standardize on ArticleGroupDetail everywhere
- [ ] Remove extracted_features from article types

### Phase 4: State Management
- [ ] Clean up WorkbenchContext to use single source of truth
- [ ] Remove duplicate feature storage
- [ ] Ensure search results are clean articles only

### Phase 5: Component Updates
- [ ] Update all components to use correct data sources
- [ ] Remove feature display from search results
- [ ] Ensure group table uses group.articles[].extracted_features

## Validation Rules

### Data Integrity
1. Articles in search results MUST NOT have extracted_features
2. Articles in groups MUST have extracted_features (may be empty {})
3. Group column_definitions MUST match keys in extracted_features
4. Frontend MUST NOT store features outside of currentGroup

### API Contracts
1. Search endpoints MUST return CanonicalResearchArticle[]
2. Group endpoints MUST return ArticleGroup with ArticleGroupDetail[]
3. Extract endpoints MUST update junction table, not articles table

### Frontend State
1. searchResults contains only clean articles
2. currentGroup contains complete contextual data
3. No duplicate article storage across state properties
4. Feature data flows only through currentGroup.articles[].extracted_features

This architecture provides clear separation of concerns, eliminates data duplication, and establishes a single source of truth for each type of data.