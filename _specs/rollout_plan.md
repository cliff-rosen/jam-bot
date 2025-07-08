# One-Day Rollout Plan: Schema/Model Unification

## Overview
Complete implementation of the unified schema/model architecture in a single day. Total estimated time: 6-8 hours.

## Phase 1: Database Layer (90 minutes)

### Step 1.1: Update Models (30 min)
**File: `backend/models.py`**
- Update status enums (MissionStatus, add HopStatus, ToolExecutionStatus)
- Add Mission.metadata field
- Create Hop model
- Create ToolStep model  
- Update Asset model (remove asset_key field if still there)

### Step 1.2: Create Migration (30 min)
**File: `backend/alembic/versions/unified_schema_rollout.py`**
- Create hops table
- Create tool_steps table
- Update missions table (add metadata, status values)
- Migrate existing JSON data from missions.current_hop/hop_history to new tables
- Update assets table if needed

### Step 1.3: Run Migration (30 min)
- Test migration on dev database
- Verify data migration correctness
- Run migration on target environment

## Phase 2: Business Schema Layer (60 minutes)

### Step 2.1: Update Workflow Schemas (45 min)
**File: `backend/schemas/workflow.py`**
- Fix MissionStatus enum (add ready_to_design, completed vs complete)
- Fix HopStatus enum (remove mission-level statuses)
- Remove hop_state, input_mapping, output_mapping from Hop schema
- Add missing fields: rationale, is_final, is_resolved, error_message
- Update ToolStep schema: add resource_configs, validation_errors
- Simplify parameter/result mapping (remove path field, align with DB)

### Step 2.2: Create New Schemas (15 min)
**Files: `backend/schemas/hop.py`, `backend/schemas/tool_step.py`**
- Extract Hop and ToolStep into separate schema files if needed
- Ensure clean imports and no circular dependencies

## Phase 3: Service Layer (120 minutes)

### Step 3.1: Update Asset Service (30 min)
**File: `backend/services/asset_service.py`**
- Remove asset_key related methods
- Update create_asset to use scope_type/scope_id correctly
- Ensure unified asset retrieval by scope

### Step 3.2: Create Hop Service (45 min)
**File: `backend/services/hop_service.py`**
- CRUD operations for hops
- Get hops by mission_id with sequence ordering
- Update hop status
- Create hop with sequence_order assignment

### Step 3.3: Create ToolStep Service (45 min)
**File: `backend/services/tool_step_service.py`**
- CRUD operations for tool steps
- Get tool steps by hop_id with sequence ordering  
- Execute tool step with direct asset ID resolution
- Update tool step status and results

## Phase 4: API Layer (90 minutes)

### Step 4.1: Update Mission Router (30 min)
**File: `backend/routers/mission.py`**
- Update to return hops from database instead of JSON
- Add mission status transitions
- Update mission creation/updates

### Step 4.2: Create Hop Router (30 min)
**File: `backend/routers/hop.py`**
- POST /missions/{mission_id}/hops - Create hop
- GET /missions/{mission_id}/hops - List hops  
- PUT /hops/{hop_id} - Update hop
- POST /hops/{hop_id}/tool-steps - Create tool step

### Step 4.3: Create ToolStep Router (30 min)
**File: `backend/routers/tool_step.py`**
- GET /hops/{hop_id}/tool-steps - List tool steps
- PUT /tool-steps/{step_id} - Update tool step
- POST /tool-steps/{step_id}/execute - Execute tool step

## Phase 5: Update Core Logic (120 minutes)

### Step 5.1: Update Mission Service (30 min)
**File: `backend/services/mission_service.py`**
- Update to work with separate hop/tool_step tables
- Fix mission status management
- Update mission state reconstruction

### Step 5.2: Update Tool Execution (45 min)
**File: `backend/tools/tool_execution.py`**
- Update to use direct asset ID resolution
- Remove mapping layer complexity
- Use new HopService and ToolStepService

### Step 5.3: Update Agent Logic (45 min)
**File: `backend/agents/primary_agent.py`**
- Update to use new hop/tool_step services
- Fix mission status transitions  
- Update hop creation and management

## Phase 6: Frontend Layer (90 minutes)

### Step 6.1: Update Types (30 min)
**Files: `frontend/src/types/workflow.ts`, `frontend/src/types/hop.ts`**
- Update MissionStatus and HopStatus enums
- Remove hop_state, input_mapping, output_mapping
- Add new hop fields: rationale, is_final, is_resolved
- Add new tool_step fields: resource_configs, validation_errors

### Step 6.2: Update API Clients (30 min)
**Files: `frontend/src/lib/api/hopApi.ts`, `frontend/src/lib/api/toolStepApi.ts`**
- Create hop API client
- Create tool step API client  
- Update mission API client

### Step 6.3: Update Components (30 min)
**Files: Various frontend components**
- Update any components that reference old hop structure
- Ensure hop and tool step rendering works with new schema
- Update status displays

## Phase 7: Testing & Validation (60 minutes)

### Step 7.1: Backend Testing (30 min)
- Test mission CRUD with new hop/tool_step structure
- Test hop creation and tool step execution
- Verify asset resolution works correctly
- Test status transitions

### Step 7.2: Frontend Testing (30 min)  
- Test mission display with new hop structure
- Test hop and tool step creation/execution
- Verify status displays work correctly
- Test asset display and management

## Execution Strategy

### Pre-work (Before starting)
- [ ] Backup database
- [ ] Create feature branch: `feature/unified-schema-rollout`
- [ ] Set up development environment

### Parallel Execution
- **Backend Developer**: Phases 1-5 (Database → Services → API)
- **Frontend Developer**: Phase 6 (after Phase 4 complete)
- **QA/Testing**: Phase 7 (concurrent with late phases)

### Critical Dependencies
1. **Phase 1** must complete before Phase 2
2. **Phase 3** depends on Phase 2 completion
3. **Phase 4** depends on Phase 3 completion  
4. **Phase 6** can start after Phase 4
5. **Phase 7** runs concurrently with Phases 5-6

### Rollback Plan
- Keep feature branch until fully tested
- Database migration has rollback script
- Can revert to previous version if issues found

### Success Criteria
- [ ] All existing missions load correctly
- [ ] New hop creation works
- [ ] Tool step execution works with direct asset references
- [ ] Asset scoping works correctly
- [ ] Status transitions work properly
- [ ] Frontend displays new structure correctly

## Risk Mitigation

### High Risk Areas
1. **Data Migration** - Existing JSON → relational structure
2. **Asset Resolution** - Direct ID references vs mapping
3. **Status Transitions** - Mission vs hop status logic

### Mitigation Strategies
1. **Extensive migration testing** before production
2. **Gradual rollout** with feature flags if needed
3. **Comprehensive test coverage** of status logic

This plan gets us from current state to fully unified schema/model architecture in 6-8 hours with proper testing and validation. 