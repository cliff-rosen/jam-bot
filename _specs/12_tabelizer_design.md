# Tabelizer Feature Design Specification (MVP)

**Document ID:** 12_tabelizer_design.md  
**Version:** 1.0  
**Date:** 2025-07-24  
**Author:** System Design  

## Overview

The Tabelizer is a table-based interface for viewing search results and adding custom columns with AI-powered data extraction.

## Core Concept

1. **Search**: User performs unified search (PubMed/Scholar)
2. **Table View**: Results display in a sortable table
3. **Custom Columns**: User adds columns by describing what to extract in natural language
4. **AI Extraction**: LLM extracts data for each article based on column description

## MVP Features

### 1. Basic Table

#### Fixed Columns
- **ID**: Article identifier (PMID or Scholar ID)
- **Title**: Article title
- **Authors**: First author + et al
- **Journal**: Publication venue
- **Year**: Publication year
- **Source**: PubMed or Scholar

### 2. Custom Columns

#### Column Types (MVP)
- **Boolean**: Yes/No questions only
- **Text**: Short text extraction (100 char max)

#### Column Creation
- User clicks "Add Column"
- Modal with two fields:
  - Column Name
  - Question/Description (natural language)
- System extracts data for all articles

### 3. Basic Operations
- **Sort**: Click column header to sort
- **Export**: Download as CSV

## Technical Implementation

### Frontend Structure

```
src/components/features/tabelizer/
├── TabelizerPage.tsx        # Main page
├── TabelizerTable.tsx       # Table component
├── AddColumnModal.tsx       # Column creation dialog
└── api/
    └── tabelizerApi.ts      # API calls
```

### Backend Integration

#### Reuse Existing Services
```python
# Extend backend/services/extraction_service.py
async def extract_tabelizer_column(
    self,
    articles: List[dict],
    column_name: str,
    column_description: str,
    column_type: str = "boolean"
) -> Dict[str, Any]:
    """Extract custom column data"""
    results = {}
    
    for article in articles:
        prompt = f"""
        Article: {article['title']}
        Abstract: {article['abstract']}
        
        Question: {column_description}
        
        {"Answer with only 'yes' or 'no'." if column_type == "boolean" else "Answer in 100 characters or less."}
        """
        
        response = await self.llm_service.generate(prompt)
        results[article['id']] = response.strip()
    
    return results
```

#### New API Endpoints
```
/api/tabelizer/
├── POST /extract-column     # Extract data for one column
└── POST /export             # Export table as CSV
```

### Data Model

```typescript
// Frontend types
interface TabelizerColumn {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'text';
  data: Record<string, string>; // articleId -> value
}

interface TabelizerState {
  articles: CanonicalResearchArticle[];
  columns: TabelizerColumn[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
```

## User Flow

1. User navigates to Tabelizer
2. Performs search using existing UnifiedSearchControls
3. Results appear in table
4. User clicks "Add Column"
5. Enters column name and question
6. System extracts data (shows loading state)
7. New column appears with extracted data
8. User can sort by any column
9. User can export to CSV

## Implementation Steps

### Week 1: Core Table
- [ ] Create TabelizerPage with routing
- [ ] Integrate UnifiedSearchControls
- [ ] Build basic table with fixed columns
- [ ] Add sorting functionality

### Week 2: Custom Columns
- [ ] Create AddColumnModal
- [ ] Extend ExtractionService
- [ ] Add extraction endpoint
- [ ] Display custom columns in table
- [ ] Add CSV export

## Example Usage

**User adds column**: "Does this study mention side effects?"
- Column Type: Boolean
- Extraction: Each article gets "yes" or "no"
- User can sort to see all studies with side effects

**User adds column**: "What is the main finding?"
- Column Type: Text
- Extraction: Brief summary for each article
- Limited to 100 characters

## No-Frills Approach

- No column editing after creation
- No column templates
- No saving/loading sessions
- No pagination (limit to 50 results)
- No advanced filtering
- No column reordering
- Simple CSV export only
- Boolean and text columns only

## Success Criteria

- User can search and see results in table
- User can add custom columns with natural language
- Extraction completes within 30 seconds for 50 articles
- User can sort by any column
- User can export results as CSV

## Code Example

```typescript
// TabelizerPage.tsx
const TabelizerPage = () => {
  const [articles, setArticles] = useState<CanonicalResearchArticle[]>([]);
  const [columns, setColumns] = useState<TabelizerColumn[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleSearch = async (params: UnifiedSearchParams) => {
    const results = await unifiedSearchApi.search(params);
    setArticles(results.articles);
  };

  const handleAddColumn = async (name: string, description: string, type: 'boolean' | 'text') => {
    setIsExtracting(true);
    
    const response = await api.post('/api/tabelizer/extract-column', {
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        abstract: a.abstract
      })),
      column_name: name,
      column_description: description,
      column_type: type
    });

    setColumns([...columns, {
      id: generateId(),
      name,
      description,
      type,
      data: response.data.results
    }]);
    
    setIsExtracting(false);
  };

  return (
    <div>
      <UnifiedSearchControls onSearch={handleSearch} />
      <TabelizerTable 
        articles={articles} 
        columns={columns}
        onAddColumn={() => setShowAddModal(true)}
      />
      {showAddModal && (
        <AddColumnModal onAdd={handleAddColumn} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};
```

That's it. Simple table, custom columns, AI extraction.