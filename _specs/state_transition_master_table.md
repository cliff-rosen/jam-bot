# State Transition Master Table

This is the comprehensive reference for all state transitions in the system, consolidating implementation status, entity updates, triggers, and business rules.

## Master Transition Table

| Step | Transition | Status | Trigger | Caller | User Session | Mission | Hop | Tool Step | Asset | Business Rules |
|------|------------|--------|---------|---------|-------------|---------|-----|-----------|-------|:---------------|
| **1.1** | PROPOSE_MISSION | ✅ IMPLEMENTED | Agent completes mission planning | `mission_specialist_node` in primary_agent.py | Links mission to active session | Creates with `status=AWAITING_APPROVAL` | No changes | No changes | Creates mission-scoped assets from mission_state data | Mission created in approval state, automatically linked to user's active session |
| **1.2** | ACCEPT_MISSION | ✅ IMPLEMENTED | User clicks "Approve Mission" button | `acceptMissionProposal()` → stateTransitionApi.acceptMission() | No changes | Updates `status=IN_PROGRESS`, `updated_at=now()` | No changes | No changes | No changes | Mission approved by user, ready for hop planning |
| **2.1** | START_HOP_PLAN | ❌ NOT IMPLEMENTED | User requests hop planning via chat | User message → `hop_designer_node` | No changes | Sets `current_hop_id=hop_id`, `updated_at=now()` | Creates with `status=HOP_PLAN_STARTED` | No changes | No changes | User initiates hop planning. Hop created in started state. Agent begins planning |
| **2.2** | PROPOSE_HOP_PLAN | ❌ NOT IMPLEMENTED | Agent completes hop design | `hop_designer_node` → stateTransitionApi.proposeHopPlan() | No changes | No changes | **Updates hop with completed plan details (description, goal, rationale, success_criteria), sets `status=HOP_PLAN_PROPOSED`, `updated_at=now()`** | No changes | **Creates hop-scoped input assets (copied from mission), hop-scoped output assets (based on output_asset_spec), and intermediate assets (temporary assets used during hop execution)** | Agent completes design and proposes to user. Hop updated with full plan details. All hop assets initialized based on completed specification |
| **2.3** | ACCEPT_HOP_PLAN | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY`, `updated_at=now()` | No changes | No changes | User approves hop plan. Ready for implementation |
| **2.4** | START_HOP_IMPL | ❌ NOT IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` | No changes | No changes | Updates `status=HOP_IMPL_STARTED`, `updated_at=now()` | No changes | No changes | User initiates implementation. Agent begins creating tool steps |
| **2.5** | PROPOSE_HOP_IMPL | ❌ NOT IMPLEMENTED | Agent completes implementation design | `hop_implementer_node` → stateTransitionApi.proposeHopImpl() | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED`, `updated_at=now()` | **Creates tool steps with `status=PROPOSED`, serializes parameter_mapping and result_mapping** | No changes | Agent proposes executable tool steps with serialized mappings. Implementation ready for approval |
| **2.6** | ACCEPT_HOP_IMPL | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY`, `updated_at=now()` | **Updates all steps from PROPOSED to READY_TO_EXECUTE, sets updated_at=now()** | No changes | User approves implementation. All tool steps ready for execution |
| **2.7** | EXECUTE_HOP | ✅ IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING`, `updated_at=now()` | **Updates first step to EXECUTING, sets started_at=now() and updated_at=now()** | No changes | Hop execution begins. First tool step starts executing |
| **2.8** | COMPLETE_TOOL_STEP | ✅ IMPLEMENTED | Tool execution completes (or simulated) | Tool engine → stateTransitionApi.completeToolStep() | No changes | No changes | No changes | **Updates step to COMPLETED, sets execution_result, completed_at=now(), started_at=now() if not set** | **Creates hop-scoped output assets based on result_mapping and execution outputs** | Individual tool step completion with output asset creation. Simulated execution supported for testing |
| **2.9** | COMPLETE_HOP | ✅ IMPLEMENTED | All tool steps completed | System detection → stateTransitionApi.completeHop() | No changes | **If final hop**: `status=COMPLETED`, `updated_at=now()`<br>**If non-final hop**: `current_hop_id=null`, `updated_at=now()` | Updates `status=COMPLETED`, `is_resolved=true`, `updated_at=now()`, adds execution_result to hop_metadata | No changes | **Promotes hop output assets to mission scope with promotion metadata** | **Hop completion triggers asset promotion. Final hop completes entire mission** |
| **2.10** | COMPLETE_MISSION | ✅ IMPLEMENTED | Manual mission completion | Direct API call → stateTransitionApi.completeMission() | No changes | Updates `status=COMPLETED`, `updated_at=now()` | No changes | No changes | No changes | Manual mission completion endpoint for exceptional cases |

## Implementation Status Summary

- **✅ Implemented (6/10 transitions): 60%**
- **❌ Not Implemented (4/10 transitions): 40%**

## Critical Missing Implementations

### Planning Workflow (Steps 2.1, 2.2)
- **Missing API Methods**: `startHopPlan()`, `proposeHopPlan()`
- **Missing Transitions**: User request → `HOP_PLAN_STARTED`, Agent completion → `HOP_PLAN_PROPOSED`
- **Backend**: StateTransitionService needs `START_HOP_PLAN` and `PROPOSE_HOP_PLAN` transaction types
- **Current Issue**: Implementation bypasses `HOP_PLAN_STARTED` state and goes directly to `HOP_PLAN_PROPOSED`

### Implementation Workflow (Steps 2.4, 2.5)
- **Missing API Methods**: `startHopImpl()`, `proposeHopImpl()`
- **Missing Transitions**: User request → `HOP_IMPL_STARTED`, Agent completion → `HOP_IMPL_PROPOSED`
- **Backend**: StateTransitionService needs `START_HOP_IMPL` and `PROPOSE_HOP_IMPL` transaction types
- **Current Issue**: Implementation bypasses `HOP_IMPL_STARTED` state and goes directly to `HOP_IMPL_PROPOSED`

### Current Implementation Gaps
The current `StateTransitionService` provides:
- `PROPOSE_HOP_PLAN`: Creates hop directly in `HOP_PLAN_PROPOSED` state (bypasses `HOP_PLAN_STARTED`)
- `PROPOSE_HOP_IMPL`: Moves from `HOP_PLAN_READY` to `HOP_IMPL_PROPOSED` (bypasses `HOP_IMPL_STARTED`)

This shortcuts the proper state progression and eliminates the intermediate working states where agents are actively planning/implementing.

## Key Implementation Details

### Asset Management Throughout Lifecycle

**Mission Assets (Global Scope)**:
- Created during `PROPOSE_MISSION` from mission_state data
- Promoted from hop outputs during `COMPLETE_HOP`
- Persist throughout mission lifecycle

**Hop Assets (Hop Scope)**:
- **Input Assets**: Copied from mission assets during `PROPOSE_HOP_PLAN`
- **Output Assets**: Created during `PROPOSE_HOP_PLAN` (empty) and `COMPLETE_TOOL_STEP` (populated)
- **Promotion**: Copied to mission scope during `COMPLETE_HOP`

**Asset Promotion Process**:
```python
# During COMPLETE_HOP
for hop_asset in hop_output_assets:
    mission_asset = create_asset(
        scope_type="mission",
        scope_id=mission_id,
        content=hop_asset.content,
        metadata={
            **hop_asset.metadata,
            "promoted_from_hop": hop_id,
            "promoted_at": timestamp
        }
    )
```

### Tool Step Status Flow

**Sequential Status Progression**:
1. `PROPOSED` → Created during `PROPOSE_HOP_IMPL`
2. `READY_TO_EXECUTE` → Updated during `ACCEPT_HOP_IMPL` (all steps)
3. `EXECUTING` → Updated during `EXECUTE_HOP` (first step only)
4. `COMPLETED` → Updated during `COMPLETE_TOOL_STEP` (individual steps)

**Execution Coordination**:
- Only first tool step starts `EXECUTING` during `EXECUTE_HOP`
- Each `COMPLETE_TOOL_STEP` can advance next step to `EXECUTING`
- Sequential execution enforced by tool execution engine

### Database Transaction Guarantees

**All transitions are atomic**:
- Status updates + asset creation/promotion in single transaction
- Automatic rollback on any failure
- Consistent timestamps across all entity updates
- Proper foreign key relationships maintained

### User Session Integration

**Automatic Session Linking**:
- `PROPOSE_MISSION` automatically links mission to user's active session
- No manual session management required
- Graceful handling if session linking fails (logs warning, continues)

## Critical Business Rules

### Status Validation
- All transitions validate current status before allowing state change
- Invalid status transitions throw `StateTransitionError` and rollback transaction
- Entity existence validated before any updates

### Asset Scoping Rules
- **Mission Assets**: Available across entire mission lifecycle
- **Hop Assets**: Scoped to individual hop, promoted to mission on completion
- **Asset Promotion**: Hop output assets become mission assets when hop completes
- **Asset Creation**: Tool step outputs create hop-scoped assets via result_mapping

### Sequential Execution
- Tool steps execute sequentially within a hop
- Next step advancement handled by tool execution engine
- Hop completes only when all tool steps are completed

### Mission Completion Logic
- **Non-final hops**: Clear `current_hop_id` for next hop, mission stays `IN_PROGRESS`
- **Final hops**: Mark mission as `COMPLETED`
- **Asset promotion**: Ensures mission outputs are populated from hop results

## Transaction Data Contracts

### Input Data Requirements
```python
# PROPOSE_MISSION
{"user_id": int, "mission": MissionData}

# ACCEPT_MISSION  
{"user_id": int, "mission_id": str}

# PROPOSE_HOP_PLAN
{"user_id": int, "mission_id": str, "hop": HopData}

# COMPLETE_TOOL_STEP
{"user_id": int, "tool_step_id": str, "simulated_output": Optional[Dict]}
```

### Output Data Structure
```python
{
    "success": bool,
    "entity_id": str,
    "status": str,
    "message": str,
    "metadata": Dict[str, Any]  # Transaction-specific data
}
```

## Transaction Guarantees

- **Atomicity**: All entity updates within a transition commit together or rollback completely
- **Consistency**: Status transitions respect state machine rules and foreign key constraints
- **Isolation**: Database transactions prevent concurrent modification conflicts
- **Durability**: All changes persist with proper timestamps and audit trails