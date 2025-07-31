# Result Table Actions - Complete Inventory & Implementation Plan

## Current Implementation Status

### ✅ **IMPLEMENTED ACTIONS**

#### **Collection Header Actions:**
1. **Load Group** - ✅ Working (opens LoadGroupModal)
2. **Select All** - ✅ Working (selects all visible articles)
3. **Add Features** - ✅ Working (opens AddFeatureModal)
4. **Extract Features** - ✅ Working (calls extractFeatures)
5. **Save Changes** - ✅ Working (saves modified groups)
6. **Save as Group / Copy to New Group** - ✅ Working (opens SaveGroupModal)
7. **Selection Count Display** - ✅ Working (shows "X selected")
8. **Clear Selection** - ✅ Working (clears selected articles)
9. **Delete Selected** - ✅ Working (removes articles from saved groups)

#### **Table Row Actions:**
1. **Checkbox Selection** - ✅ Working (individual article selection)
2. **View Article** - ✅ Working (opens ArticleWorkbenchModal)
3. **External Link** - ✅ Working (opens PubMed/Scholar links)

### ❌ **MISSING/INCOMPLETE ACTIONS**

#### **High Priority - Core Functionality:**

1. **Add to Group Workflow** - ❌ **MISSING**
   - Status: Stub function only (`console.log`)
   - Needs: Full modal workflow with group selection and navigation choice
   - Impact: **HIGH** - Core feature for organizing articles

2. **Cross-Page Selection Management** - ❌ **INCOMPLETE**
   - Status: Selection state clears when navigating pages
   - Needs: Persistent selection across pagination
   - Impact: **MEDIUM** - User experience for bulk operations

3. **Selection-Based Feature Extraction** - ❌ **INCOMPLETE**
   - Status: "Add Features to Selected" calls regular Add Features
   - Needs: Extract features only on selected articles
   - Impact: **MEDIUM** - Performance and user expectations

4. **Confirmation Dialogs** - ❌ **MISSING**
   - Status: Delete Selected has no confirmation 
   - Needs: Confirmation for destructive actions
   - Impact: **MEDIUM** - Data safety

#### **Medium Priority - UX Improvements:**

5. **Multi-Page Selection Indicator** - ❌ **MISSING**
   - Status: No indication of selections across pages
   - Needs: "X selected across Y pages" display
   - Impact: **LOW** - User awareness

6. **Duplicate Detection in Add to Group** - ❌ **MISSING**
   - Status: No duplicate article checking
   - Needs: Warning when adding articles already in target group
   - Impact: **LOW** - Data quality

7. **Bulk Export Actions** - ❌ **MISSING**
   - Status: No export functionality implemented
   - Needs: CSV/JSON export for selected articles
   - Impact: **LOW** - Advanced user feature

### ⚠️ **PARTIALLY WORKING**

1. **Master Checkbox Logic** - ⚠️ **PARTIAL**
   - Status: Works but logic could be cleaner
   - Issue: Complex indeterminate state handling
   - Impact: **LOW** - Minor UX inconsistency

2. **Button State Management** - ⚠️ **PARTIAL**
   - Status: Buttons show/hide correctly but some edge cases
   - Issue: Button states not always consistent with collection state
   - Impact: **LOW** - Minor UI inconsistency

## Implementation Plan

### **Phase A: Critical Missing Features (High Priority)**

#### **A1. Add to Group Modal Workflow** 🔥 **CRITICAL**
- **Files to Create:**
  - `AddToGroupModal.tsx` - Group selection and navigation choice
- **Files to Modify:**
  - `WorkbenchPage.tsx` - Replace stub function with modal logic
  - `CollectionHeader.tsx` - Connect to real Add to Group handler
- **Features:**
  - Group list with search/filter
  - Article count preview
  - Navigation choice (Stay Here/Go to Group)
  - Success confirmation
- **Estimated Effort:** 4-6 hours

#### **A2. Selection-Based Feature Extraction** 
- **Files to Modify:**
  - `AddFeatureModal.tsx` - Accept selectedArticleIds prop
  - `WorkbenchContext.tsx` - Update extractFeatures to accept article filter
  - `CollectionHeader.tsx` - Pass selection context to feature actions
- **Features:**
  - Extract features only on selected articles when in selection mode
  - Clear messaging about scope of extraction
- **Estimated Effort:** 2-3 hours

#### **A3. Confirmation Dialogs**
- **Files to Create:**
  - `ConfirmationDialog.tsx` - Reusable confirmation component
- **Files to Modify:**
  - `CollectionHeader.tsx` - Add confirmation for Delete Selected
  - `WorkbenchPage.tsx` - Add confirmation for Reset with unsaved changes
- **Features:**
  - "Are you sure?" dialog for destructive actions
  - Clear messaging about what will be deleted/lost
- **Estimated Effort:** 2 hours

### **Phase B: Selection Enhancements (Medium Priority)**

#### **B1. Cross-Page Selection Management**
- **Files to Modify:**
  - `WorkbenchContext.tsx` - Move selection state to context
  - `WorkbenchPage.tsx` - Remove local selection state
  - `PaginationControls.tsx` - Preserve selection across pages
- **Features:**
  - Selection state persists when navigating pages
  - Multi-page selection indicators
- **Estimated Effort:** 3-4 hours

#### **B2. Enhanced Selection UI**
- **Files to Modify:**
  - `CollectionHeader.tsx` - Better selection count display
  - `WorkbenchTable.tsx` - Improved master checkbox logic
- **Features:**
  - "X selected across Y pages" display
  - Better indeterminate checkbox states
  - Selection highlights and visual feedback
- **Estimated Effort:** 2 hours

### **Phase C: Advanced Features (Low Priority)**

#### **C1. Duplicate Detection**
- **Files to Modify:**
  - `AddToGroupModal.tsx` - Check for existing articles in target groups
  - Backend APIs - Add duplicate detection endpoints
- **Features:**
  - Warn when adding articles already in target group
  - Option to skip duplicates or add anyway
- **Estimated Effort:** 3-4 hours

#### **C2. Export Functionality**
- **Files to Create:**
  - `ExportModal.tsx` - Export options and progress
- **Files to Modify:**
  - `CollectionHeader.tsx` - Add export buttons
  - `WorkbenchContext.tsx` - Implement export logic
- **Features:**
  - CSV/JSON export of selected articles
  - Export with or without feature data
- **Estimated Effort:** 3-4 hours

## Recommended Implementation Order

### **Sprint 1: Core Missing Features (Week 1)**
1. **A1. Add to Group Modal** - Unblocks core workflow
2. **A3. Confirmation Dialogs** - Prevents data loss accidents
3. **A2. Selection-Based Features** - Completes selection workflow

### **Sprint 2: Selection Polish (Week 2)**
1. **B1. Cross-Page Selection** - Major UX improvement
2. **B2. Enhanced Selection UI** - Polish and consistency

### **Sprint 3: Advanced Features (Week 3)**
1. **C1. Duplicate Detection** - Data quality
2. **C2. Export Functionality** - Power user features

## Success Criteria

### **Phase A Complete:**
- ✅ Users can add selected articles to existing groups
- ✅ Navigation choice works (Stay Here/Go to Group)
- ✅ Feature extraction scoped to selection when appropriate  
- ✅ No accidental data loss from unconfirmed deletions

### **Phase B Complete:**
- ✅ Selection state persists across page navigation
- ✅ Clear indication of multi-page selections
- ✅ Smooth, predictable selection experience

### **Phase C Complete:**
- ✅ Duplicate article detection and handling
- ✅ Full export capabilities for research workflows
- ✅ Complete feature parity with spec

## Risk Assessment

### **High Risk:**
- **Add to Group Modal** - Complex workflow with navigation logic
- **Cross-Page Selection** - State management across components

### **Medium Risk:**
- **Selection-Based Features** - Scoping logic could be complex
- **Duplicate Detection** - Requires backend coordination

### **Low Risk:**
- **Confirmation Dialogs** - Standard UI pattern
- **Export Functionality** - Well-defined data transformation