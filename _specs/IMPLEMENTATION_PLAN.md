# Implementation Plan - Code Alignment with Specifications

**Based on**: COMPREHENSIVE_MISALIGNMENT_REPORT.md  
**Target**: Achieve 100% alignment between code and specifications  
**Timeline**: 3 weeks (phased approach)

---

## Phase 1: Critical Fixes (Week 1) - BREAKING CHANGES

### **Day 1-2: Enum Standardization**

#### **Task 1.1: Fix ToolExecutionStatus Enum (CRITICAL)**

**Files to Update:**
```
backend/models.py (lines 36-44)
backend/schemas/workflow.py (lines 22-30)  
frontend/src/lib/types/index.ts
frontend/src/types/workflow.ts
```

**Changes Required:**
```python
# Replace in all files
class ToolExecutionStatus(str, PyEnum):
    AWAITING_CONFIGURATION = "awaiting_configuration"  # CHANGE: was PROPOSED
    READY_TO_EXECUTE = "ready_to_execute"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    # REMOVE: READY_TO_CONFIGURE
```

**Database Migration Required:**
```sql
-- Create migration file: add_awaiting_configuration_status.sql
UPDATE tool_steps SET status = 'awaiting_configuration' WHERE status = 'proposed';
UPDATE tool_steps SET status = 'awaiting_configuration' WHERE status = 'ready_to_configure';
ALTER TYPE toolexecutionstatus RENAME VALUE 'proposed' TO 'awaiting_configuration';
-- Remove 'ready_to_configure' from enum
```

**Testing:**
- [ ] Unit tests for enum value validation
- [ ] API integration tests  
- [ ] Frontend-backend enum compatibility tests

#### **Task 1.2: Fix AssetStatus Enum (HIGH)**

**Files to Update:**
```
backend/models.py (lines 46-54)
backend/schemas/asset.py (enum definition)
frontend/src/types/asset.ts
```

**Changes Required:**
```python
class AssetStatus(str, PyEnum):
    PENDING = "pending"
    AWAITING_APPROVAL = "awaiting_approval"  # ADD
    READY_FOR_PROCESSING = "ready_for_processing"  # ADD
    PROCESSING = "processing"  # ADD
    READY = "ready"
    ERROR = "error"
    EXPIRED = "expired"
    # REMOVE: PROPOSED, IN_PROGRESS
```

**Testing:**
- [ ] Asset workflow state transition tests
- [ ] Default status initialization tests

### **Day 3: Data Integrity Fixes**

#### **Task 1.3: Fix User→Hops Cascade (CRITICAL)**

**File to Update:**
```
backend/models.py (User model relationship)
```

**Changes Required:**
```python
# In User model - REMOVE dangerous cascade
class User(Base):
    # OLD (DANGEROUS):
    # hops = relationship("Hop", cascade="all, delete-orphan")
    
    # NEW (SAFE):
    hops = relationship("Hop")  # No cascade
```

**Testing:**
- [ ] Test user deletion doesn't delete hops
- [ ] Test hop deletion still works properly
- [ ] Data integrity validation

#### **Task 1.4: Fix validate_tool_chain Function (CRITICAL)**

**File to Update:**
```
backend/schemas/workflow.py (lines 376, 408, etc.)
```

**Changes Required:**
```python
# Replace all instances of undefined 'hop_state' with 'hop_assets'
if state_asset_id not in hop_assets:  # CHANGE: was hop_state
    errors.append(...)
    
# Line 408 and similar lines
if state_asset not in hop_assets:  # CHANGE: was hop_state
```

**Testing:**
- [ ] Tool chain validation unit tests
- [ ] Error handling tests
- [ ] Integration tests with real hop data

### **Day 4-5: Schema Inheritance and Default Values**

#### **Task 1.5: Fix Asset Schema Inheritance (CRITICAL)**

**File to Update:**
```
backend/schemas/asset.py
```

**Investigation Required:**
- [ ] Verify SchemaEntity class exists and has schema_definition field
- [ ] Ensure Asset properly inherits this field
- [ ] Test schema validation functionality

#### **Task 1.6: Fix Default Status Values (HIGH)**

**Files to Update:**
```
backend/schemas/workflow.py (Hop and ToolStep classes)
backend/schemas/asset.py (Asset class)
```

**Changes Required:**
```python
# Hop schema
status: HopStatus = Field(default=HopStatus.HOP_PLAN_STARTED)  # CHANGE: was HOP_PLAN_PROPOSED

# Asset schema  
status: AssetStatus = Field(default=AssetStatus.PENDING)  # Keep as is - PENDING is correct

# ToolStep schema
status: ToolExecutionStatus = Field(default=ToolExecutionStatus.AWAITING_CONFIGURATION)  # CHANGE: was PROPOSED
```

**Testing:**
- [ ] Default value initialization tests
- [ ] Workflow state progression tests

---

## Phase 2: Frontend-Backend Consistency (Week 2)

### **Day 6-7: TypeScript Type Updates**

#### **Task 2.1: Update TypeScript Enums**

**Files to Update:**
```
frontend/src/lib/types/index.ts
frontend/src/types/asset.ts
frontend/src/types/workflow.ts
```

**Changes Required:**
```typescript
// Update AssetStatus to match Python
export enum AssetStatus {
    PENDING = "pending",
    AWAITING_APPROVAL = "awaiting_approval",  // ADD
    READY_FOR_PROCESSING = "ready_for_processing",  // ADD
    PROCESSING = "processing",  // ADD
    READY = "ready",
    ERROR = "error",
    EXPIRED = "expired"
    // REMOVE: PROPOSED, IN_PROGRESS
}

// Update ToolExecutionStatus to match Python
export enum ToolExecutionStatus {
    AWAITING_CONFIGURATION = "awaiting_configuration",  // CHANGE: was PROPOSED
    READY_TO_EXECUTE = "ready_to_execute",
    EXECUTING = "executing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
    // REMOVE: READY_TO_CONFIGURE
}
```

#### **Task 2.2: Add Missing UserSession Fields**

**File to Update:**
```
frontend/src/types/user_session.ts
```

**Changes Required:**
```typescript
export interface UserSession {
    id: string;
    user_id: number;
    name: string;
    status: UserSessionStatus;
    chat_id: string;  // ADD
    mission_id?: string;  // ADD
    session_metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    last_activity_at: string;
}
```

### **Day 8-10: API Integration Testing**

#### **Task 2.3: Frontend-Backend API Compatibility**

**Testing Areas:**
- [ ] Mission API enum compatibility
- [ ] Hop API enum compatibility  
- [ ] Asset API enum compatibility
- [ ] ToolStep API enum compatibility
- [ ] UserSession API field compatibility

**Files to Review:**
```
frontend/src/lib/api/*.ts (all API clients)
backend/routers/*.py (all API endpoints)
```

---

## Phase 3: Enhanced Features (Week 3)

### **Day 11-12: Database Relationship Enhancements**

#### **Task 3.1: Add Asset Viewonly Relationships**

**File to Update:**
```
backend/models.py (Mission and Hop models)
```

**Changes Required:**
```python
# Add to Mission model
class Mission(Base):
    # ... existing fields
    
    # Add viewonly asset relationship
    assets = relationship("Asset", 
                         primaryjoin="and_(Mission.id == foreign(Asset.scope_id), Asset.scope_type == 'mission')",
                         viewonly=True)

# Add to Hop model  
class Hop(Base):
    # ... existing fields
    
    # Add viewonly asset relationship
    assets = relationship("Asset",
                         primaryjoin="and_(Hop.id == foreign(Asset.scope_id), Asset.scope_type == 'hop')",
                         viewonly=True)
```

#### **Task 3.2: Add Missing Hop Tracking Fields**

**Files to Update:**
```
backend/schemas/workflow.py (Hop class)
frontend/src/types/workflow.ts (Hop interface)
```

**Changes Required:**
```python
# Add to Hop schema (if missing)
class Hop(BaseModel):
    # ... existing fields
    intended_input_asset_ids: List[str] = Field(default_factory=list)
    intended_output_asset_ids: List[str] = Field(default_factory=list) 
    intended_output_asset_specs: List[Dict[str, Any]] = Field(default_factory=list)
```

### **Day 13-15: Helper Methods and Type Definitions**

#### **Task 3.3: Add TypeScript Helper Method Signatures**

**Files to Update:**
```
frontend/src/types/workflow.ts
frontend/src/types/asset.ts
```

**Changes Required:**
```typescript
export interface Mission {
    // ... existing fields
    
    // Add helper method signatures
    get_input_ids(): string[];
    get_output_ids(): string[];
    get_intermediate_ids(): string[];
    readonly asset_summary: AssetMapSummary;
}

export interface Hop {
    // ... existing fields
    
    // Add helper method signatures  
    get_hop_input_ids(): string[];
    get_hop_output_ids(): string[];
    get_hop_intermediate_ids(): string[];
    readonly asset_summary: AssetMapSummary;
}
```

#### **Task 3.4: Centralize Type Exports**

**File to Update:**
```
frontend/src/lib/types/index.ts
```

**Changes Required:**
```typescript
// Ensure all enums are exported from main index
export { AssetStatus, AssetRole } from '../types/asset';
export { MissionStatus, HopStatus, ToolExecutionStatus } from '../types/workflow';
export { UserSessionStatus } from '../types/user_session';
export { MessageRole } from '../types/chat';
```

---

## Quality Assurance Plan

### **Automated Testing Requirements**

#### **Unit Tests (Required for each phase)**
```
backend/tests/test_models.py
backend/tests/test_schemas.py  
frontend/src/tests/types.test.ts
```

**Coverage Requirements:**
- [ ] Enum value validation (100% coverage)
- [ ] Default value initialization (100% coverage)
- [ ] Schema inheritance validation (100% coverage)
- [ ] Relationship cascade behavior (100% coverage)

#### **Integration Tests**
```
backend/tests/test_api_integration.py
frontend/src/tests/api.test.ts
```

**Coverage Requirements:**
- [ ] Frontend-backend enum compatibility (100% coverage)
- [ ] API request/response type matching (100% coverage)
- [ ] Asset workflow state transitions (100% coverage)

### **Database Migration Testing**

#### **Migration Validation**
```
backend/alembic/versions/xxx_fix_tool_execution_status.py
```

**Requirements:**
- [ ] Safe migration of existing ToolExecutionStatus data
- [ ] Rollback capability for all enum changes
- [ ] Data integrity validation before/after migration

### **Manual Testing Checklist**

#### **Critical Path Testing**
- [ ] Mission creation workflow end-to-end
- [ ] Hop planning workflow end-to-end  
- [ ] Tool execution workflow end-to-end
- [ ] Asset state transition workflows
- [ ] User session management workflows

#### **Error Handling Testing**
- [ ] Invalid enum value handling
- [ ] API error responses match TypeScript expectations
- [ ] Database constraint violation handling

---

## Risk Mitigation

### **Breaking Change Management**

#### **Phase 1 Risks (Critical)**
- **Database Migration Failure**: Have rollback plan ready
- **API Breaking Changes**: Version API endpoints if needed
- **Frontend Build Failures**: Update incrementally with feature flags

#### **Communication Plan**
- [ ] Notify all developers before Phase 1 starts
- [ ] Document all breaking changes in CHANGELOG.md
- [ ] Provide migration guide for any dependent services

### **Rollback Plan**

#### **Code Rollback**
```bash
# For each phase, tag the previous working state
git tag phase-0-baseline
git tag phase-1-complete  
git tag phase-2-complete
```

#### **Database Rollback**
```sql
-- Have reverse migrations ready for each enum change
-- Test rollback procedures in staging environment first
```

---

## Success Metrics

### **Phase 1 Success Criteria**
- [ ] Zero runtime errors related to enum mismatches
- [ ] Zero data integrity issues from relationship cascades
- [ ] All critical functions execute without errors

### **Phase 2 Success Criteria**  
- [ ] 100% frontend-backend API compatibility
- [ ] All TypeScript types match Python schema definitions
- [ ] Zero type errors in frontend build

### **Phase 3 Success Criteria**
- [ ] All helper methods functional and tested
- [ ] Enhanced relationship queries working efficiently
- [ ] Complete type coverage for all features

### **Overall Success Criteria**
- [ ] COMPREHENSIVE_MISALIGNMENT_REPORT.md shows 0 critical issues
- [ ] All automated tests passing
- [ ] Production deployment successful
- [ ] Zero user-facing issues reported

**Final Target**: 100% alignment between specifications and implementation across all layers.

---

This implementation plan provides a systematic approach to fixing all identified misalignments while minimizing risk and ensuring quality throughout the process.