# State Transition Database Impact Analysis

This document provides a detailed table of database entity updates for each implemented state transition in the StateTransitionService.

## Database Entity Update Matrix

| Transition | User Session | Mission | Hop | Tool Step | Asset | Notes |
|------------|-------------|---------|-----|-----------|-------|-------|
| **1.1 PROPOSE_MISSION** | Links mission to active session | Creates new mission with `status=AWAITING_APPROVAL`, sets timestamps | No changes | No changes | Creates mission-scoped assets with `scope_type=mission`, `scope_id=mission_id` | Auto-links to user's active session |
| **1.2 ACCEPT_MISSION** | No changes | Updates `status=IN_PROGRESS`, `updated_at=now()` | No changes | No changes | No changes | Mission ready for hop planning |
| **2.1 PROPOSE_HOP_PLAN** | No changes | Sets `current_hop_id=hop_id`, `updated_at=now()` | Creates new hop with `status=HOP_PLAN_PROPOSED`, `mission_id=mission_id`, sets all core fields | No changes | Copies mission assets to hop scope: mission inputs→hop inputs, mission outputs→hop outputs with `scope_type=hop`, `scope_id=hop_id` | Asset role mapping preserves input/output semantics |
| **2.2 Agent completes hop plan** | No changes | No changes | Updates via agent logic (not StateTransitionService) | No changes | No changes | Handled internally by hop_designer_node |
| **2.3 ACCEPT_HOP_PLAN** | No changes | No changes | Updates `status=HOP_PLAN_READY`, `updated_at=now()` | No changes | No changes | Hop ready for implementation |
| **2.4 PROPOSE_HOP_IMPL** | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED`, `updated_at=now()` | Creates tool steps with `hop_id=hop_id`, serialized `parameter_mapping`, `result_mapping`, `resource_configs` | No changes | Tool steps define execution plan |
| **2.5 Agent completes implementation** | No changes | No changes | Updates via agent logic (not StateTransitionService) | No changes | No changes | Handled internally by hop_implementer_node |
| **2.6 ACCEPT_HOP_IMPL** | No changes | No changes | Updates `status=HOP_IMPL_READY`, `updated_at=now()` | Updates all tool steps with `status=PROPOSED` to `status=READY_TO_EXECUTE`, `updated_at=now()` | No changes | Hop and tool steps ready for execution |
| **2.7 EXECUTE_HOP** | No changes | No changes | Updates `status=EXECUTING`, `updated_at=now()` | Updates **first tool step** from `READY_TO_EXECUTE` to `EXECUTING`, sets `started_at=now()`, `updated_at=now()` | No changes | First tool step begins execution |
| **2.8 COMPLETE_HOP** | No changes | If `is_final=true`: `status=COMPLETED`<br>If `is_final=false`: `current_hop_id=null`, `updated_at=now()` | Updates `status=COMPLETED`, `is_resolved=true`, adds execution result to `hop_metadata`, `updated_at=now()` | **Prerequisite**: All tool steps must already be `status=COMPLETED` (verified, not changed) | Promotes hop output assets to mission scope: `scope_type=mission`, adds `promoted_from_hop` metadata | Asset promotion makes hop outputs available for subsequent hops |

## Sequential Tool Step Execution (Between 2.7 and 2.8)

During hop execution, tool steps progress sequentially **outside** of StateTransitionService:

| Event | Tool Step Updates | Trigger |
|-------|------------------|---------|
| **Step N Completes** | Current step: `EXECUTING` → `COMPLETED`, sets `completed_at=now()`<br>Next step: `READY_TO_EXECUTE` → `EXECUTING`, sets `started_at=now()` | Tool execution engine |
| **All Steps Complete** | All tool steps: `status=COMPLETED` | Triggers 2.8 COMPLETE_HOP |

**Example 3-step execution flow:**
1. **2.7 EXECUTE_HOP**: Step 1: `READY_TO_EXECUTE` → `EXECUTING`
2. **Step 1 completes**: Step 1: `EXECUTING` → `COMPLETED`, Step 2: `READY_TO_EXECUTE` → `EXECUTING`  
3. **Step 2 completes**: Step 2: `EXECUTING` → `COMPLETED`, Step 3: `READY_TO_EXECUTE` → `EXECUTING`
4. **Step 3 completes**: Step 3: `EXECUTING` → `COMPLETED` → **Triggers 2.8 COMPLETE_HOP**

## Key Database Patterns

### 1. **Scope-Based Asset Management**
- **Mission Scope**: `scope_type=mission`, `scope_id=mission_id`
- **Hop Scope**: `scope_type=hop`, `scope_id=hop_id`
- **Role Preservation**: Input assets remain inputs, output assets remain outputs when copied between scopes

### 2. **Status Flow Validation**
- Each transition validates current status before update
- Status changes are atomic within database transactions
- Rollback occurs on any validation failure

### 3. **Relationship Management**
- **Mission ↔ Hop**: `mission.current_hop_id` links active hop
- **Hop ↔ Tool Steps**: `tool_step.hop_id` links execution plan
- **Asset Scoping**: `scope_type` + `scope_id` determines asset visibility

### 4. **Metadata and Timestamps**
- All entities update `updated_at` on status changes
- Tool steps store serialized mapping configurations
- Hop metadata captures execution results
- Asset metadata tracks promotion history

## Asset Flow Examples

### Hop Planning (2.1)
```
Mission Assets → Hop Assets
Input: user_query (mission scope) → user_query (hop scope, role=input)
Output: search_results (mission scope) → search_results (hop scope, role=output)
```

### Hop Completion (2.8)
```
Hop Assets → Mission Assets (Promotion)
Output: search_results (hop scope, completed) → search_results (mission scope)
+ metadata: {"promoted_from_hop": "hop_id", "promoted_at": "timestamp"}
```

## Transaction Guarantees

1. **Atomicity**: All database changes within a transition commit together or rollback completely
2. **Consistency**: Status transitions respect allowed state machine paths
3. **Isolation**: Concurrent access prevented by database transactions
4. **Durability**: Committed changes persist with proper timestamps

## Implementation Notes

- **Session Linking**: Automatically handled during mission creation (1.1)
- **Asset Copying**: Preserves schema definitions and role semantics
- **Tool Step Serialization**: Parameter/result mappings stored as JSON
- **Error Handling**: ValidationError exceptions trigger transaction rollback
- **Status Validation**: Current status must match expected status for transition

This matrix ensures complete traceability of how each state transition affects the underlying database entities while maintaining data consistency and relationship integrity.