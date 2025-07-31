# Research Workbench Actions Hierarchy

## Overview

This document defines the placement, availability, and behavior of action buttons in the Research Workbench to create a consistent and intuitive user experience.

## UI Hierarchy

### 1. Top Header Actions (Global Level)
**Location**: Top of the Research Workbench page  
**Purpose**: High-level navigation and workspace management  
**Actions Available**:
- **Load Group** - Navigate to a different saved group
- **Reset** - Clear current workspace and return to search state

**Actions NOT Available**:
- Save actions (belong at result level)
- Feature management (belongs at result level)
- Article selection actions (belong at result level)

### 2. Result Header Actions (Collection Level)
**Location**: Above the results table, below collection info  
**Purpose**: Actions that operate on the current collection  
**Actions Available**:
- **Load Group** - Switch to a different group (duplicate for convenience)
- **Add Features** - Add feature definitions to extract
- **Extract Features** - Run AI extraction on defined features
- **Save as Group** - Create new group from current state
- **Save Changes** - Update existing group (when modified)
- **Add to Group** - Merge current results into existing group
- **Select All/None** - Bulk selection toggles

## Collection States and Available Actions

### Search Results State
**Characteristics**:
- Source: Search API
- Articles: Fixed set from search (cannot be edited for composition)
- Modifications allowed: Features, notes only

**Available Actions**:
```
Result Header:
├── Add Features (always)
├── Extract Features (when features defined)
├── Save as Group (always)
├── Add to Group (always)
└── Select All/None (always, page-scoped)

Top Header:
├── Load Group (always)
└── Reset (always)
```

**Not Available**:
- Save Changes (search results can't be "saved", only saved as new group)
- Article composition editing (add/remove articles)

### Saved Group State (Unmodified)
**Characteristics**:
- Source: Saved group from database
- Articles: Loaded from saved state
- Modifications: None since loading

**Available Actions**:
```
Result Header:
├── Add Features (always)
├── Extract Features (when features defined)
├── Save as Group (always - creates copy)
├── Add to Group (always)
└── Select All/None (always, page-scoped)

Top Header:
├── Load Group (always)
└── Reset (always)
```

**Not Available**:
- Save Changes (no modifications to save)

### Saved Group State (Modified)
**Characteristics**:
- Source: Saved group from database
- Articles: May have been modified (added/removed)
- Features: May have been added/removed/extracted
- Modifications: Has unsaved changes

**Available Actions**:
```
Result Header:
├── Add Features (always)
├── Extract Features (when features defined)
├── Save Changes (always - updates existing group)
├── Save as Group (always - creates new copy)
├── Add to Group (always)
├── Select All/None (always, page-scoped)
└── Remove Selected (when articles selected)

Top Header:
├── Load Group (always, with unsaved changes warning)
└── Reset (always, with unsaved changes warning)
```

## Selection Behavior

### Page-Scoped Selection
- Selection operates only on currently visible results (current page)
- "Select All" selects all articles on current page only
- Actions like "Add to Group" operate on selected articles only
- If no articles selected, actions operate on all visible articles

### Cross-Page Considerations
- Users must navigate pages to select articles from different pages
- Selection state is maintained when navigating between pages
- Clear indication of total selected count across pages

## Button Grouping and Visual Hierarchy

### Top Header Layout
```
[Research Workbench] [Collection Badge]    [Load Group] [Reset]
```

### Result Header Layout
```
Collection Info: [Name] [X of Y articles] [• Z features]

Actions Bar:
Primary: [Add Features] [Extract Features]
Secondary: [Save Changes] [Save as Group] [Add to Group]
Selection: [Select All] [Select None] [Remove Selected]
```

## State Indicators

### Collection Badge
- **Blue**: Search results
- **Green**: Saved group (unmodified)  
- **Yellow**: Saved group (modified)*
- **Asterisk (*)**: Indicates unsaved changes

### Button States
- **Disabled**: When action not applicable (e.g., Extract Features with no features defined)
- **Loading**: Show spinner when action in progress
- **Destructive**: Red styling for Remove Selected

## User Experience Flows

### 1. Search → Save Workflow
1. User performs search
2. Results appear with search collection badge
3. User can add features and extract
4. User saves via "Save as Group" (creates new) or "Add to Group" (merges)

### 2. Load Group → Modify → Save Workflow  
1. User loads group via "Load Group"
2. Group appears with green badge
3. User modifies (adds features, etc.)
4. Badge turns yellow with asterisk
5. "Save Changes" becomes available
6. User saves changes or saves as new group

### 3. Selection-Based Operations
1. User selects specific articles (checkboxes)
2. "Remove Selected" becomes available (if in saved group)
3. "Add to Group" operates on selected articles only
4. Selection persists across feature operations

## Implementation Notes

### State Management
- Track collection source (search/saved_group)
- Track modification state (is_modified flag)
- Track selection state (selected article IDs)
- Track current page for scoped selection

### Button Availability Logic
```typescript
const canSaveChanges = collection.source === 'saved_group' && collection.is_modified;
const canRemoveSelected = collection.source === 'saved_group' && selectedArticles.length > 0;
const canExtractFeatures = collection.feature_definitions.length > 0;
```

### Confirmation Dialogs
- Loading different group when current has unsaved changes
- Resetting when unsaved changes exist
- Removing selected articles (destructive action)

## Benefits of This Hierarchy

1. **Clear Separation**: Global navigation vs. collection operations
2. **Consistent Placement**: Users know where to find specific actions
3. **State-Aware**: Actions available based on what makes sense for current state
4. **Selection-Friendly**: Clear scoping of selection-based operations
5. **Modification Tracking**: Clear indication of what needs saving