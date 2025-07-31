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

### Selection Mode Activation
Selection mode is activated when user checks any article checkbox or clicks "Select All/None" buttons.

**Visual Changes When Selection Mode Active**:
- Article checkboxes become prominent
- Selected articles get highlighted background
- Selection action buttons appear/become enabled
- Selection count indicator shows (e.g., "3 selected")

### Page-Scoped Selection
- Selection operates only on currently visible results (current page)
- "Select All" selects all articles on current page only
- Selection state is maintained when navigating between pages
- Clear indication of total selected count across all pages: "X selected across Y pages"

### Selection-Based Actions

#### Available in All Collection Types (Search Results & Groups)
**Add Features**: Add feature definitions and optionally extract on selected articles
- Button text: "Add Features to Selected" (when articles selected)
- Default text: "Add Features" (when none selected, operates on all visible)
- Feature extraction, if enabled, runs only on selected articles

**Save as Group**: Create new group containing only selected articles
- Button text: "Save Selected as Group" (when articles selected)
- Default text: "Save as Group" (when none selected, operates on all visible)

**Add to Group**: Merge selected articles into existing group  
- Button text: "Add Selected to Group" (when articles selected)
- Default text: "Add to Group" (when none selected, operates on all visible)
- After completion, user chooses: stay in current view or navigate to the target group

#### Available Only in Saved Groups (Not Search Results)
**Delete Selected**: Remove selected articles from the group
- Button text: "Delete Selected" (red/destructive styling)
- Only appears when in saved group AND articles are selected
- Requires confirmation dialog
- Updates group's modified state

### Selection State Management

#### Selection Count Display
**No Selection**:
```
Actions: [Add Features] [Save as Group] [Add to Group]
```

**With Selection (Search Results)**:
```
3 selected • Actions: [Add Features to Selected] [Save Selected as Group] [Add Selected to Group] [Clear Selection]
```

**With Selection (Saved Group)**:
```
3 selected • Actions: [Add Features to Selected] [Save Selected as Group] [Add Selected to Group] [Delete Selected] [Clear Selection]
```

#### Multi-Page Selection  
**Search Results with Cross-Page Selection**:
```
7 selected across 3 pages • Actions: [Add Features to Selected] [Save Selected as Group] [Add Selected to Group] [Clear Selection]
```

**Saved Group (no pagination, all on one "page")**:
```
4 selected • Actions: [Add Features to Selected] [Save Selected as Group] [Add Selected to Group] [Delete Selected] [Clear Selection]
```

### Selection Action Behavior

#### When Articles Selected
- **Add Features to Selected**: Adds feature definitions to collection, runs extraction only on selected articles
- **Save Selected as Group**: Creates new group with only selected articles
- **Add Selected to Group**: Adds only selected articles to chosen existing group, with navigation choice
- **Delete Selected**: Removes selected articles from current group (groups only)

#### When No Articles Selected  
- **Add Features**: Adds feature definitions to collection, runs extraction on all visible articles
- **Save as Group**: Creates new group with all visible articles (current page for search, all articles for group)
- **Add to Group**: Adds all visible articles to chosen existing group, with navigation choice
- **Delete Selected**: Button not visible/available

### Cross-Page Selection Workflow

#### For Search Results
1. User selects articles on page 1
2. Navigates to page 2, selects more articles
3. Selection indicator shows: "5 selected across 2 pages"
4. "Save Selected as Group" creates group with all 5 selected articles
5. User can navigate back to see which articles are selected on each page

#### For Saved Groups (No Pagination)
1. All articles visible on single view
2. Selection works normally within the visible set
3. No cross-page complexity

## Add to Group Workflow

### Modal Dialog Flow
When user clicks "Add to Group" or "Add Selected to Group":

1. **Group Selection Modal Opens**
   - Shows list of existing groups with metadata (name, description, article count)
   - Search/filter capability for large group lists
   - Preview of articles being added (count and titles)

2. **User Selects Target Group** 
   - Group list shows which groups already contain some of the articles being added
   - Warning indicators for potential duplicates
   - Option to "Skip duplicates" or "Add anyway"

3. **Post-Action Navigation Choice**
   After successful addition, modal shows confirmation with options:
   
   **Success Message**:
   ```
   ✅ Added 5 articles to "MC4R Studies Q3 2024"
   
   What would you like to do next?
   
   [Stay Here]  [Go to Group]
   ```

### Navigation Options

#### Stay Here (Default)
- User remains in current view (search results or current group)
- Selection is cleared
- Success toast shows: "Added 5 articles to MC4R Studies Q3 2024"
- User can continue working with current collection

#### Go to Group  
- User navigates to the target group
- Target group loads with newly added articles visible
- Success toast shows: "Added 5 articles from [source collection]"
- Newly added articles could be highlighted temporarily

### Default Behavior Logic

**Recommended Default**: "Stay Here"
- Most common workflow: user is browsing search results or working in a group and wants to copy some articles elsewhere
- Preserves current work context
- Less disruptive to user's current task

**When "Go to Group" Makes Sense**:
- User specifically wants to continue working with the combined collection
- User is done with current view and ready to move to the target group
- User wants to verify the addition was successful

### Implementation Details

#### Modal UI Structure
```
┌─────────────────────────────────────┐
│ Add to Existing Group               │
├─────────────────────────────────────┤
│ Adding 5 selected articles to:     │
│                                     │
│ [Search: existing groups...]        │
│                                     │
│ ○ MC4R Studies Q3 2024             │
│   23 articles • Updated 2 days ago  │
│                                     │  
│ ○ Melanocortin Research            │
│   45 articles • Updated 1 week ago  │
│                                     │
│ [Cancel]              [Add to Group] │
└─────────────────────────────────────┘
```

#### Success Confirmation
```
┌─────────────────────────────────────┐
│ ✅ Successfully Added               │
├─────────────────────────────────────┤
│ Added 5 articles to                 │
│ "MC4R Studies Q3 2024"             │
│                                     │
│ What would you like to do next?     │
│                                     │
│ [Stay Here]        [Go to Group]    │
│                                     │
│ ☐ Remember my choice               │
└─────────────────────────────────────┘
```

### User Preference Storage
- Optional: "Remember my choice" checkbox
- Stores user preference for future "Add to Group" actions
- Can be changed in settings or by not checking the box on subsequent actions

## Button Grouping and Visual Hierarchy

### Top Header Layout
```
[Research Workbench] [Collection Badge]    [Load Group] [Reset]
```

### Result Header Layout
The result header must clearly distinguish between search results and saved groups while maintaining consistent structure.

#### Search Results Header
```
🔍 Search Results                                    [Collection Info]
"query terms here" • X total results • Page Y/Z     [• A features]

Actions Bar:
Primary: [Add Features] [Extract Features]
Secondary: [Save as Group] [Add to Group]
Selection: [Select All] [Select None]
```

#### Saved Group Header (Unmodified)
```
📁 Saved Group                                       [Collection Info]  
"Group Name" • X articles total                     [• A features]

Actions Bar:
Primary: [Add Features] [Extract Features]
Secondary: [Save as Group] [Add to Group]
Selection: [Select All] [Select None]
```

#### Saved Group Header (Modified)
```
📁 Saved Group (Modified)*                          [Collection Info]
"Group Name" • X articles total                     [• A features]

Actions Bar:
Primary: [Add Features] [Extract Features]  
Secondary: [Save Changes] [Save as Group] [Add to Group]
Selection: [Select All] [Select None] [Remove Selected]
```

## Collection Header Branding Rules

### Search Results Branding
**Visual Identity**:
- **Icon**: 🔍 Search icon (magnifying glass)
- **Title**: "Search Results" 
- **Badge Color**: Blue background (`bg-blue-50 dark:bg-blue-900/20`)
- **Query Display**: Show actual search query in quotes
- **Count Format**: "X total results" (emphasizes total available)
- **Pagination**: "Page Y/Z" when multiple pages

**Example**:
```
🔍 Search Results
"melanocortin receptor signaling" • 1,247 total results • Page 1/63 • 5 features
```

### Saved Group Branding  
**Visual Identity**:
- **Icon**: 📁 Folder icon  
- **Title**: "Saved Group" or "Saved Group (Modified)*"
- **Badge Color**: 
  - Green (`bg-green-50 dark:bg-green-900/20`) for unmodified
  - Yellow (`bg-yellow-50 dark:bg-yellow-900/20`) for modified
- **Name Display**: Show group name (user-defined)
- **Count Format**: "X articles total" (emphasizes contained articles)
- **No Pagination**: Groups show all articles at once

**Examples**:
```
📁 Saved Group  
"MC4R Studies Q3 2024" • 23 articles total • 8 features
```

```
📁 Saved Group (Modified)*
"MC4R Studies Q3 2024" • 25 articles total • 8 features  
```

### Information Hierarchy in Headers

#### Primary Information (Left Side)
1. **Collection Type Icon + Label** - Visual brand identity
2. **Collection Name/Query** - What the user is looking at
3. **Total Count** - How many items in the collection
4. **Pagination Info** - (Search results only) Current position
5. **Feature Count** - How many features are defined

#### Secondary Information (Right Side) 
- Feature count badge when features exist
- Modification indicators (asterisk, "Modified" text)

### Header Layout Examples

#### Responsive Design
**Desktop Layout**:
```
🔍 Search Results                                                    • 5 features
"CRISPR gene editing cardiac function" • 892 total results • Page 2/45
```

**Mobile Layout**:
```
🔍 Search Results • 5 features
"CRISPR gene editing cardiac function"  
892 total results • Page 2/45
```

#### Different States
**Search with Features**:
```
🔍 Search Results                                    • 3 features
"retinal degeneration treatment" • 445 total results • Page 1/23
```

**Search without Features**:  
```
🔍 Search Results
"retinal degeneration treatment" • 445 total results • Page 1/23
```

**New Group**:
```
📁 Saved Group
"Retinal Studies Collection" • 15 articles total
```

**Modified Group with Features**:
```
📁 Saved Group (Modified)*                          • 7 features  
"Retinal Studies Collection" • 17 articles total
```

### Styling Specifications

#### Typography
- **Collection Type**: `text-lg font-semibold` 
- **Collection Name/Query**: `text-base font-medium` in quotes for search
- **Count Information**: `text-sm text-muted-foreground`
- **Feature Badge**: `text-xs` in colored badge

#### Colors & Badges
**Search Results**:
- Header badge: `bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800`
- Icon: `text-blue-600 dark:text-blue-400`

**Saved Group (Clean)**:
- Header badge: `bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`  
- Icon: `text-green-600 dark:text-green-400`

**Saved Group (Modified)**:
- Header badge: `bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`
- Icon: `text-yellow-600 dark:text-yellow-400`
- Asterisk: `text-yellow-600 dark:text-yellow-400`

#### Spacing
- Consistent padding: `p-4` for header container
- Gap between elements: `gap-3` for main items, `gap-2` for sub-items
- Feature badge positioned with `ml-auto` or flexbox end alignment

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