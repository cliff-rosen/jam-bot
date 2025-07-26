# Tabelizer Article Groups Feature Specification

## Overview

This specification outlines the design for adding persistent article group storage to the Tabelizer feature. Users will be able to save their search results and extracted columns to named groups in the database, and later load these groups to continue their analysis.

## Data Storage Strategy

### Column Metadata Storage
Column definitions are stored in the `article_group.columns` JSONB field as an array of column objects:
```json
[
  {
    "id": "col_1234567890",
    "name": "Has Clinical Data",
    "description": "Whether the article mentions clinical trial data",
    "type": "boolean",
    "options": null
  },
  {
    "id": "col_0987654321",
    "name": "Relevance Score",
    "description": "How relevant this article is to our research",
    "type": "score",
    "options": {"min": 1, "max": 10, "step": 1}
  }
]
```

### Column Data Storage
Column data is stored with each article in the `extracted_features` field:
```json
{
  "id": "pubmed_12345",
  "title": "Example Article",
  "authors": ["Smith J", "Doe A"],
  "abstract": "...",
  "extracted_features": {
    "Has Clinical Data": "yes",
    "Relevance Score": "8",
    "poi_relevance": "high",
    "doi_relevance": "medium"
  }
}
```

### Data Reconstruction
When loading a group, the system:
1. Reads column definitions from `article_group.columns`
2. Loads articles from `article_group_detail`
3. Reconstructs TabelizerColumn objects by:
   - Using column metadata for structure
   - Extracting column data from each article's `extracted_features` using column names as keys

## Database Schema

### `article_group` Table

```sql
CREATE TABLE article_group (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    search_query TEXT,
    search_provider VARCHAR(50),
    search_params JSONB,
    columns JSONB DEFAULT '[]', -- List of TabelizerColumn objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    article_count INTEGER DEFAULT 0
);

CREATE INDEX idx_article_group_user_id ON article_group(user_id);
CREATE INDEX idx_article_group_created_at ON article_group(created_at);
CREATE INDEX idx_article_group_name ON article_group(user_id, name);
```

### `article_group_detail` Table

```sql
CREATE TABLE article_group_detail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_group_id UUID NOT NULL REFERENCES article_group(id) ON DELETE CASCADE,
    article_data JSONB NOT NULL, -- Full CanonicalResearchArticle JSON including extracted_features
    position INTEGER NOT NULL DEFAULT 0, -- Display order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_article_group_detail_group_id ON article_group_detail(article_group_id);
CREATE INDEX idx_article_group_detail_position ON article_group_detail(article_group_id, position);
```

## Backend API Endpoints

### Article Groups Management

```python
# GET /api/tabelizer/groups
# List user's article groups
@router.get("/groups")
async def list_article_groups(
    current_user: User = Depends(get_current_user)
) -> List[ArticleGroupResponse]:
    pass

# POST /api/tabelizer/groups
# Create new article group
@router.post("/groups")
async def create_article_group(
    request: CreateArticleGroupRequest,
    current_user: User = Depends(get_current_user)
) -> ArticleGroupResponse:
    pass

# GET /api/tabelizer/groups/{group_id}
# Get specific article group with articles and columns
@router.get("/groups/{group_id}")
async def get_article_group(
    group_id: str,
    current_user: User = Depends(get_current_user)
) -> ArticleGroupDetailResponse:
    pass

# PUT /api/tabelizer/groups/{group_id}
# Update article group metadata
@router.put("/groups/{group_id}")
async def update_article_group(
    group_id: str,
    request: UpdateArticleGroupRequest,
    current_user: User = Depends(get_current_user)
) -> ArticleGroupResponse:
    pass

# DELETE /api/tabelizer/groups/{group_id}
# Delete article group
@router.delete("/groups/{group_id}")
async def delete_article_group(
    group_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    pass
```

### Group Content Management

```python
# POST /api/tabelizer/groups/{group_id}/save
# Save current tabelizer state to group
@router.post("/groups/{group_id}/save")
async def save_to_group(
    group_id: str,
    request: SaveToGroupRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    pass

# POST /api/tabelizer/groups/{group_id}/articles
# Add articles to existing group
@router.post("/groups/{group_id}/articles")
async def add_articles_to_group(
    group_id: str,
    request: AddArticlesRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    pass

# DELETE /api/tabelizer/groups/{group_id}/articles/{article_id}
# Remove article from group
@router.delete("/groups/{group_id}/articles/{article_id}")
async def remove_article_from_group(
    group_id: str,
    article_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    pass
```

## Pydantic Models

```python
class ArticleGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class CreateArticleGroupRequest(ArticleGroupBase):
    search_query: Optional[str] = None
    search_provider: Optional[str] = None
    search_params: Optional[Dict[str, Any]] = None

class UpdateArticleGroupRequest(ArticleGroupBase):
    pass

class ArticleGroupResponse(ArticleGroupBase):
    id: str
    user_id: str
    search_query: Optional[str]
    search_provider: Optional[str]
    search_params: Optional[Dict[str, Any]]
    columns: List[Dict[str, Any]]  # Column metadata
    created_at: datetime
    updated_at: datetime
    article_count: int

class TabelizerColumnData(BaseModel):
    id: str
    name: str
    description: str
    type: Literal['boolean', 'text', 'score']
    data: Dict[str, str]  # article_id -> value
    options: Optional[Dict[str, Any]] = None  # for score columns

class ArticleGroupDetailResponse(ArticleGroupResponse):
    articles: List[CanonicalResearchArticle]
    columns: List[TabelizerColumnData]

class SaveToGroupRequest(BaseModel):
    articles: List[CanonicalResearchArticle]  # Articles with extracted_features
    columns: List[Dict[str, Any]]  # Column metadata only (id, name, description, type, options)
    search_query: Optional[str] = None
    search_provider: Optional[str] = None
    search_params: Optional[Dict[str, Any]] = None
    overwrite: bool = False  # Whether to replace existing data

class AddArticlesRequest(BaseModel):
    articles: List[CanonicalResearchArticle]
```

## Frontend Components

### New Components to Create

#### `ArticleGroupManager.tsx`
- Dropdown/modal for selecting existing groups or creating new ones
- Shows group metadata (name, article count, last updated)
- Quick actions (load, save, delete)

#### `SaveGroupModal.tsx`
- Form for creating new groups or updating existing ones
- Options for overwriting vs. appending to existing groups
- Validation for group names

#### `LoadGroupModal.tsx`
- List of user's existing groups with search/filter
- Preview of group contents (article count, columns)
- Load confirmation with option to merge or replace current data

### Updated Components

#### `TabelizerPage.tsx`
```typescript
// New state additions
const [currentGroup, setCurrentGroup] = useState<ArticleGroupResponse | null>(null);
const [userGroups, setUserGroups] = useState<ArticleGroupResponse[]>([]);
const [showSaveModal, setShowSaveModal] = useState(false);
const [showLoadModal, setShowLoadModal] = useState(false);

// New handlers
const handleSaveGroup = async (groupData: CreateArticleGroupRequest) => {
  // Save current state to new or existing group
};

const handleLoadGroup = async (groupId: string) => {
  // Load group data and replace current state
};

const handleDeleteGroup = async (groupId: string) => {
  // Delete group with confirmation
};
```

#### `TabelizerTable.tsx`
```typescript
// Add group info to header
<div className="flex justify-between items-center p-4 border-b">
  <div className="flex items-center gap-2">
    <div className="text-sm text-gray-600">
      {currentGroup ? (
        <Badge variant="outline">{currentGroup.name}</Badge>
      ) : (
        "Unsaved Session"
      )}
    </div>
    <div className="text-sm text-gray-600">
      {articles.length} articles · {columns.length} custom columns
    </div>
  </div>
  <div className="flex gap-2">
    <Button onClick={() => setShowLoadModal(true)} variant="outline" size="sm">
      <FolderOpen className="w-4 h-4 mr-1" />
      Load Group
    </Button>
    <Button onClick={() => setShowSaveModal(true)} variant="outline" size="sm">
      <Save className="w-4 h-4 mr-1" />
      Save Group
    </Button>
    {/* existing buttons */}
  </div>
</div>
```

## User Experience Flow

### Saving Results Flow
1. User performs search and adds columns in Tabelizer
2. User clicks "Save Group" button
3. Modal opens with options:
   - Create new group (name, description)
   - Save to existing group (dropdown selection)
   - Overwrite vs. append options for existing groups
4. System saves articles, columns, and metadata to database
5. UI updates to show current group name in header

### Loading Results Flow
1. User clicks "Load Group" button
2. Modal opens showing list of their saved groups
3. Each group shows:
   - Name and description
   - Article count and column count
   - Last updated date
   - Preview of search query
4. User selects group and confirms load
5. System replaces current Tabelizer state with group data
6. UI updates with loaded articles, columns, and group info

### Group Management Flow
1. User can view all groups in load modal
2. Delete action available with confirmation
3. Groups can be renamed/updated via edit action
4. Bulk operations (delete multiple, export multiple)

## Implementation Phases

### Phase 1: Core Backend
- [ ] Create database tables and migrations
- [ ] Implement Pydantic models
- [ ] Create CRUD operations for article groups
- [ ] Add basic API endpoints

### Phase 2: Save Functionality
- [ ] Implement save-to-group endpoint
- [ ] Create SaveGroupModal component
- [ ] Add save button to TabelizerTable header
- [ ] Handle success/error states

### Phase 3: Load Functionality
- [ ] Implement load-from-group endpoint
- [ ] Create LoadGroupModal component
- [ ] Add load button and group indicator
- [ ] Handle state replacement logic

### Phase 4: Management Features
- [ ] Add group editing capabilities
- [ ] Implement delete functionality
- [ ] Add group search/filtering
- [ ] Create group export options

### Phase 5: UX Enhancements
- [ ] Add unsaved changes detection
- [ ] Implement auto-save functionality
- [ ] Add group sharing capabilities
- [ ] Create group templates/presets

## Data Processing Logic

### Saving a Group
```python
def save_to_group(request: SaveToGroupRequest):
    # 1. Extract column metadata (without data)
    column_metadata = [
        {
            "id": col["id"],
            "name": col["name"],
            "description": col["description"],
            "type": col["type"],
            "options": col.get("options")
        }
        for col in request.columns
    ]
    
    # 2. Save/update article_group with column metadata
    group.columns = column_metadata
    
    # 3. Save articles with their extracted_features
    for article in request.articles:
        # article.extracted_features already contains all column data
        save_article_to_group_detail(article)
```

### Loading a Group
```python
def load_group(group_id: str):
    # 1. Load group with column metadata
    group = get_article_group(group_id)
    column_metadata = group.columns
    
    # 2. Load all articles
    articles = get_group_articles(group_id)
    
    # 3. Reconstruct TabelizerColumn objects
    columns = []
    for col_meta in column_metadata:
        column_data = {}
        for article in articles:
            # Extract column value from article's extracted_features
            value = article.extracted_features.get(col_meta["name"], "-")
            column_data[article.id] = value
        
        columns.append({
            "id": col_meta["id"],
            "name": col_meta["name"],
            "description": col_meta["description"],
            "type": col_meta["type"],
            "options": col_meta.get("options"),
            "data": column_data
        })
    
    return articles, columns
```

## Technical Considerations

### Data Consistency
- Column names in `extracted_features` must match column metadata names
- Handle missing column data gracefully (default to "-")
- Preserve all extracted_features (both custom and standard)

### Performance
- Paginate group lists for users with many groups
- Consider lazy loading of article content in group previews
- Optimize JSONB queries for large article datasets

### Security
- Ensure users can only access their own groups
- Validate group ownership on all operations
- Sanitize group names and descriptions

### Migration Strategy
- Existing Tabelizer sessions remain unaffected
- No breaking changes to current API
- Graceful degradation if database is unavailable

## Future Enhancements

- **Group Collaboration**: Share groups with other users
- **Group Templates**: Create reusable column configurations
- **Export Integration**: Direct export from saved groups
- **Analytics**: Track usage patterns across groups
- **API Integration**: Allow external tools to create/modify groups
- **Automation**: Scheduled updates to dynamic groups based on search queries