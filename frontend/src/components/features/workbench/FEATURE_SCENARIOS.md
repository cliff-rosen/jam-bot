# Feature Management Scenarios

## Complete Scenario Matrix

| Button | Modal Mode | Extract Immediately | Target Articles | Action | API Call |
|--------|------------|-------------------|-----------------|---------|----------|
| **Add Features** | `add` | ❌ No | All | Add definitions only | `addFeatureDefinitionsLocal()` |
| **Add Features** | `add` | ❌ No | Selected | Add definitions only | `addFeatureDefinitionsLocal()` |
| **Add Features** | `add` | ✅ Yes | All | Add + Extract | `addFeaturesAndExtract(features, type, undefined)` |
| **Add Features** | `add` | ✅ Yes | Selected | Add + Extract | `addFeaturesAndExtract(features, type, selectedIds)` |
| **Extract Features** | `extract` | N/A (always) | All | Extract existing | `extractFeatureValues(featureIds, type, undefined)` |
| **Extract Features** | `extract` | N/A (always) | Selected | Extract existing | `extractFeatureValues(featureIds, type, selectedIds)` |

## UI Flow

### Scenario 1: Add Features (Deferred)
1. User clicks "Add Features" button
2. Modal opens in `mode='add'`
3. User selects/creates features
4. User **unchecks** "Extract features immediately"
5. Submit → `addFeatureDefinitionsLocal()`
6. Features added to collection, no extraction

### Scenario 2: Add Features + Extract Now
1. User clicks "Add Features" button
2. Modal opens in `mode='add'`
3. User selects/creates features
4. User **keeps checked** "Extract features immediately" (default)
5. Submit → `addFeaturesAndExtract()`
6. Features added AND extracted for target articles

### Scenario 3: Extract Existing Features
1. User clicks "Extract Features" button
2. Modal opens in `mode='extract'`
3. Shows existing features with checkboxes
4. User selects which features to extract
5. Submit → `extractFeatureValues()`
6. Selected features extracted for target articles

## Article Targeting

All three scenarios respect the current article selection:
- If `selectedArticleIds.length > 0`: Operation targets only selected articles
- If `selectedArticleIds.length === 0`: Operation targets all articles in collection

## Current Implementation Status

✅ **Scenario 1**: Add without extraction
- Modal shows "Extract immediately" checkbox
- When unchecked, calls `addFeatureDefinitionsLocal()`
- Works for all/selected articles

✅ **Scenario 2**: Add with extraction  
- Modal shows "Extract immediately" checkbox (checked by default)
- When checked, calls `addFeaturesAndExtract()`
- Works for all/selected articles

✅ **Scenario 3**: Extract existing
- Modal shows feature selection list
- No "Extract immediately" checkbox (always extracts)
- Calls `extractFeatureValues()` with selected feature IDs
- Works for all/selected articles

## Code Locations

- **Modal Component**: `AddFeatureModal.tsx`
  - Handles both `add` and `extract` modes
  - Shows appropriate UI based on mode
  - Passes selection to parent

- **Page Handler**: `WorkbenchPage.tsx::handleAddFeatures()`
  - Routes to correct API based on mode and extractImmediately flag
  - Handles article targeting via selectedArticleIds

- **Context API**: `WorkbenchContext.tsx`
  - `addFeatureDefinitionsLocal()`: Add only
  - `addFeaturesAndExtract()`: Add + extract
  - `extractFeatureValues()`: Extract only