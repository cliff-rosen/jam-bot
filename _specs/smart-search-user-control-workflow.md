# Smart Search Lab - User Control Workflow Analysis

## Correct Workflow: User Control at Every Decision Point

The Smart Search Lab is designed to give users **complete control** at every step. Users should be able to review, edit, and approve each transformation before proceeding. This is a research tool where transparency and user control are paramount.

| Step | UI Label | System Processing | User Review/Edit Action | User Decision | Output State | Next Action |
|------|----------|-------------------|------------------------|---------------|--------------|-------------|
| 1 | **Question Input** | None | **USER**: Enters/edits research question | Accept question as ready | `original_question` stored | **USER** clicks "Refine Question" |
| 2 | **Question Refinement** | **BACKEND**: LLM refines question via `/refine` | **USER**: Reviews refined question<br/>**USER**: Can edit/modify refined text | Accept refined question OR<br/>Edit and accept custom version | `refined_question` stored | **USER** clicks "Generate Search Query" |
| 3 | **Search Query Generation** | **BACKEND**: LLM generates boolean search query via `/generate-query` | **USER**: Reviews boolean query<br/>**USER**: Can edit search operators, terms | Accept search query OR<br/>Edit and accept custom version | `search_query` stored | **USER** clicks "Execute Search" |
| 4 | **Search Execution** | **BACKEND**: Searches databases via `/execute` | **USER**: Reviews search results<br/>**USER**: Can manually delete irrelevant articles<br/>**USER**: Can adjust max results, re-run | Accept curated results OR<br/>Delete articles and/or modify parameters | `curated_search_results[]` stored | **USER** clicks "Generate Filter" |
| 5 | **Semantic Discriminator Generation** | **BACKEND**: LLM creates evaluation criteria | **USER**: Reviews discriminator prompt<br/>**USER**: Can edit evaluation criteria | Accept discriminator OR<br/>Edit and accept custom version | `discriminator_prompt` stored | **USER** sets strictness and clicks "Filter Articles" |
| 6 | **Semantic Filtering** | **BACKEND**: Applies discriminator via `/filter-stream` | **USER**: Watches real-time filtering<br/>**USER**: Can stop/modify mid-process | Monitor progress<br/>Optionally stop and adjust | `filtered_results[]` stored | **USER** reviews final results |
| 7 | **Final Results** | None | **USER**: Reviews filtered articles<br/>**USER**: Can export, save, or start over | Use results OR<br/>Return to any previous step | Final workflow state | Workflow complete or restart |

## Current Implementation Gaps

### Missing User Control Points:

1. **Step 2 - Question Refinement**:
   - ✅ **HAVE**: LLM generates refined question
   - ❌ **MISSING**: Editable text area for user to modify refined question
   - ❌ **MISSING**: "Accept" vs "Edit" workflow

2. **Step 3 - Search Query Generation**:
   - ✅ **HAVE**: LLM generates boolean search query  
   - ❌ **MISSING**: Editable text area for user to modify search query
   - ❌ **MISSING**: "Accept" vs "Edit" workflow

3. **Step 4 - Search Results Review**:
   - ✅ **HAVE**: Display search results
   - ❌ **MISSING**: User ability to manually delete articles from results
   - ❌ **MISSING**: Delete/remove buttons on each article
   - ❌ **MISSING**: User ability to adjust search parameters
   - ❌ **MISSING**: Re-run search with different parameters

4. **Step 5 - Semantic Discriminator**:
   - ❌ **COMPLETELY MISSING**: Step doesn't exist in current UI
   - ❌ **MISSING**: Show generated discriminator prompt to user
   - ❌ **MISSING**: Allow user to edit evaluation criteria
   - ❌ **MISSING**: Separate step between search results and filtering

5. **Step 6 - Filtering Control**:
   - ✅ **HAVE**: Strictness setting
   - ❌ **MISSING**: Ability to stop filtering mid-process
   - ❌ **MISSING**: Real-time preview of discriminator being applied

## Required UI Components for Full User Control

### Step 2 - Question Refinement:
```
Original Question: [readonly text]
Refined Question: [editable textarea]
[Accept Refinement] [Edit Refinement] [Use Original]
```

### Step 3 - Search Query Generation:
```
Refined Question: [readonly text]  
Generated Boolean Query: [editable textarea]
[Accept Query] [Edit Query] [Regenerate]
```

### Step 4 - Search Results Review:
```
Search Query: [readonly text]
Results: [article list with delete buttons for each article]
   - [X] Article Title 1 - Journal, Year [Delete]
   - [X] Article Title 2 - Journal, Year [Delete]  
   - [X] Article Title 3 - Journal, Year [Delete]
Selected: [count] of [total] articles
Max Results: [editable number] [Re-run Search]
Sources: [checkboxes for PubMed, Scholar] [Re-run Search]
[Select All] [Deselect All] [Remove Selected]
```

### Step 5 - Semantic Discriminator (NEW STEP):
```
Research Question: [readonly text]
Search Query: [readonly text]
Generated Evaluation Criteria: [editable textarea - large]
Strictness: [low/medium/high radio buttons]
[Accept Criteria] [Edit Criteria] [Regenerate]
```

### Step 6 - Filtering with Control:
```
Discriminator: [readonly preview]
Progress: [real-time progress bar]
Current Article: [show current article being evaluated]
[Pause Filtering] [Stop Filtering] [Adjust Criteria]
```

## Backend API Changes Needed

### New Endpoint Required:
```
POST /lab/smart-search/generate-discriminator
Input: { refined_query, search_query, strictness }
Output: { discriminator_prompt }
```

### Enhanced Endpoints:
- `/filter-stream` should support pause/resume functionality
- All endpoints should support user-edited inputs (not just LLM outputs)

This workflow ensures users maintain complete control and transparency over every decision in the research process, which is essential for academic/research use cases.