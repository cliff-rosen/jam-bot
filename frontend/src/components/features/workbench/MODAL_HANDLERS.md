# WorkbenchPage Modal Action Handlers

This document describes all the modal action handlers used in the WorkbenchPage component.

## Group Management Handlers

### `handleSaveGroup(name: string, description?: string)`
Creates a new group from the current collection (search results or modified group).
- If saving search results, clears search and switches to groups tab
- If selected articles exist, only saves those articles
- Shows success toast on completion

### `handleUpdateExistingGroup()`
Updates an existing group with all current modifications.
- Syncs the current collection state back to the backend
- Preserves all changes: articles, features, and metadata
- Used when user chooses "Update existing" in SaveGroupModal

### `handleDeleteGroup(groupId: string, groupName: string)`
Permanently deletes a group from the backend.
- Shows confirmation in the UI before this is called
- Updates the groups list after deletion
- Re-throws errors for parent component handling

### `handleUpdateGroupInfo(name: string, description?: string)`
Updates only the metadata (name/description) of an existing group.
- Does not affect articles or features
- Automatically refreshes the groups list
- Used in the CollectionHeader component

### `handleAddToGroup(groupId: string)`
Adds articles from current collection to an existing group.
- Used in SaveGroupModal when choosing "Add to existing"
- Does not navigate away from current view

## Feature Management Handlers

### `handleAddFeatures(features: FeatureDefinition[], extractImmediately?: boolean)`
Adds new feature definitions to the current collection.
- If `extractImmediately` is true, also extracts values using AI
- Shows appropriate success/error toasts
- Used by AddFeatureModal

### Feature Operations (via workbench context)
- `workbench.extractFeatureValues()` - Extracts feature values using AI
- `workbench.removeFeatureDefinition()` - Removes a feature definition
- `workbench.updateFeatureValueLocal()` - Updates a single feature value

## Article Management Handlers

### `handleToggleArticleSelection(articleId: string)`
Toggles selection state of a single article.
- Used for checkbox interactions in the table

### `handleSelectAll()`
Selects all articles on the current page.
- Only affects visible articles, not entire collection

### `handleSelectNone()`
Clears all article selections.

### `handleDeleteSelected()`
Removes selected articles from the current collection.
- Only affects local state, not backend
- Must sync to save changes permanently

### `handleAddSelectedToGroup()`
Shows the AddToGroupModal for selected articles.
- If no articles selected, uses all visible articles

### `handleAddToGroupAction(groupId: string, navigateToGroup: boolean)`
Executes the add to group operation with navigation option.
- Can optionally navigate to the target group after adding
- Clears selection after successful addition
- Shows appropriate success messages based on action

## Navigation & Data Loading Handlers

### `handleSearch(page?: number)`
Executes a search query and loads results.
- Validates search query before execution
- Updates search collection with results
- Handles pagination for search results

### `handleLoadGroup(groupId: string, page?: number)`
Loads a saved group into the group collection.
- Fetches group details with pagination
- Shows success toast with article count

### `loadExistingGroups()`
Loads the list of existing groups for modal dropdowns.
- Called when SaveGroupModal or AddToGroupModal opens
- Uses the centralized groups list from context

### `loadGroupsData(force?: boolean)`
Refreshes the groups list data.
- Can force refresh even if data exists
- Used by GroupsTab component

## Modal State Management

The component manages several modals:

1. **AddFeatureModal** (`showAddModal`)
   - For adding new feature definitions
   - Can optionally extract immediately

2. **SaveGroupModal** (`showSaveModal`)
   - For saving collections as new groups
   - Updating existing groups
   - Adding to existing groups

3. **AddToGroupModal** (`showAddToGroupModal`)
   - For adding articles to existing groups
   - Includes navigation options

4. **ArticleWorkbenchModal** (via `workbench.selectedArticleDetail`)
   - For viewing article details
   - Managed through context state

## Error Handling

All handlers follow a consistent error handling pattern:
1. Try/catch blocks for async operations
2. Console.error for debugging
3. User-friendly toast notifications
4. Some handlers re-throw for parent handling

## State Dependencies

These handlers interact with:
- `workbench` context for core operations
- `activeTab` for determining current collection
- `selectedArticleIds` for bulk operations
- Various modal state variables
- Toast notifications for user feedback 