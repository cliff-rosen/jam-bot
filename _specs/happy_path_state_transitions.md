# Happy Path State Transitions

This document outlines the step-by-step happy path state transitions for Missions and Hops, showing exactly what fields change at each transition point.

## Mission Happy Path Flow

### 1. Mission Creation (Initial State)
**State:** `PROPOSED`
**Fields Changed:**
- `id` → Generated UUID
- `name` → User-provided mission name
- `description` → User-provided description
- `goal` → User-provided goal
- `success_criteria` → User-provided criteria
- `status` → `PROPOSED`
- `current_hop_id` → `null`
- `current_hop` → `null`
- `hops` → `[]`
- `mission_state` → `{}` (empty asset collection)
- `mission_metadata` → `{}`
- `created_at` → Current timestamp
- `updated_at` → Current timestamp

### 2. Mission Accepted by User
**State:** `PROPOSED` → `READY_FOR_NEXT_HOP`
**Fields Changed:**
- `status` → `READY_FOR_NEXT_HOP`
- `updated_at` → Current timestamp

**Trigger:** User accepts mission proposal from frontend

### 3. Hop Design Begins
**State:** `READY_FOR_NEXT_HOP` → `BUILDING_HOP`
**Fields Changed:**
- `status` → `BUILDING_HOP`
- `updated_at` → Current timestamp

**Trigger:** Hop is created with status `PROPOSED` or `READY_TO_RESOLVE`

### 4. Hop Ready for Execution
**State:** `BUILDING_HOP` → `HOP_READY_TO_EXECUTE`
**Fields Changed:**
- `status` → `HOP_READY_TO_EXECUTE`
- `updated_at` → Current timestamp

**Trigger:** Current hop status changes to `READY_TO_EXECUTE`

### 5. Hop Execution Begins
**State:** `HOP_READY_TO_EXECUTE` → `EXECUTING_HOP`
**Fields Changed:**
- `status` → `EXECUTING_HOP`
- `updated_at` → Current timestamp

**Trigger:** Current hop status changes to `EXECUTING`

### 6a. Non-Final Hop Completes
**State:** `EXECUTING_HOP` → `READY_FOR_NEXT_HOP`
**Fields Changed:**
- `status` → `READY_FOR_NEXT_HOP`
- `current_hop_id` → `null` (or next hop ID)
- `current_hop` → `null` (or next hop object)
- `hops` → Add completed hop to history
- `mission_state` → Updated with hop outputs
- `updated_at` → Current timestamp

**Trigger:** Current hop status changes to `COMPLETED` and `is_final` = `false`

### 6b. Final Hop Completes
**State:** `EXECUTING_HOP` → `COMPLETED`
**Fields Changed:**
- `status` → `COMPLETED`
- `current_hop_id` → `null`
- `current_hop` → `null`
- `hops` → Add completed hop to history
- `mission_state` → Updated with final outputs
- `updated_at` → Current timestamp

**Trigger:** Current hop status changes to `COMPLETED` and `is_final` = `true`

---

## Hop Happy Path Flow

### 1. Hop Creation (Initial State)
**State:** `PROPOSED`
**Fields Changed:**
- `id` → Generated UUID
- `sequence_order` → Auto-incremented based on existing hops
- `name` → AI-generated hop name
- `description` → AI-generated description
- `goal` → AI-generated goal
- `success_criteria` → AI-generated criteria
- `rationale` → AI-generated rationale
- `status` → `PROPOSED`
- `is_final` → `false` (or `true` if final hop)
- `is_resolved` → `false`
- `error_message` → `null`
- `hop_metadata` → `{}`
- `tool_steps` → `[]`
- `hop_state` → Populated with input/output assets
- `created_at` → Current timestamp
- `updated_at` → Current timestamp

### 2. Hop Proposal Accepted
**State:** `PROPOSED` → `READY_TO_RESOLVE`
**Fields Changed:**
- `status` → `READY_TO_RESOLVE`
- `updated_at` → Current timestamp

**Trigger:** User accepts hop proposal from frontend
**Side Effect:** Mission status changes to `BUILDING_HOP`

### 3. Hop Implementation Completed
**State:** `READY_TO_RESOLVE` → `READY_TO_EXECUTE`
**Fields Changed:**
- `status` → `READY_TO_EXECUTE`
- `is_resolved` → `true`
- `tool_steps` → Populated with configured tool steps
- `hop_state` → Updated with intermediate assets
- `updated_at` → Current timestamp

**Trigger:** AI completes hop implementation with valid tool chain
**Side Effect:** Mission status changes to `HOP_READY_TO_EXECUTE`

### 4. Hop Implementation Accepted
**State:** `READY_TO_EXECUTE` → `EXECUTING` (when execution starts)
**Fields Changed:**
- `status` → `EXECUTING`
- `updated_at` → Current timestamp

**Trigger:** User accepts hop implementation and starts execution
**Side Effect:** Mission status changes to `EXECUTING_HOP`

### 5. Hop Execution Completes
**State:** `EXECUTING` → `COMPLETED`
**Fields Changed:**
- `status` → `COMPLETED`
- `hop_state` → Updated with final output values
- `updated_at` → Current timestamp

**Trigger:** All tool steps complete successfully
**Side Effect:** Mission status changes to `READY_FOR_NEXT_HOP` (if not final) or `COMPLETED` (if final)

---

## Tool Step Happy Path Flow

### 1. Tool Step Creation
**State:** `PROPOSED`
**Fields Changed:**
- `id` → Generated UUID
- `tool_id` → Selected tool ID
- `sequence_order` → Auto-incremented within hop
- `name` → Tool step name
- `description` → Tool step description
- `status` → `PROPOSED`
- `parameter_mapping` → Input parameter configuration
- `result_mapping` → Output result configuration
- `resource_configs` → Resource configurations
- `validation_errors` → `[]`
- `execution_result` → `null`
- `error_message` → `null`
- `created_at` → Current timestamp
- `updated_at` → Current timestamp
- `started_at` → `null`
- `completed_at` → `null`

### 2. Tool Step Configuration
**State:** `PROPOSED` → `READY_TO_CONFIGURE`
**Fields Changed:**
- `status` → `READY_TO_CONFIGURE`
- `updated_at` → Current timestamp

### 3. Tool Step Ready for Execution
**State:** `READY_TO_CONFIGURE` → `READY_TO_EXECUTE`
**Fields Changed:**
- `status` → `READY_TO_EXECUTE`
- `validation_errors` → `[]` (cleared if validation passes)
- `updated_at` → Current timestamp

### 4. Tool Step Execution Begins
**State:** `READY_TO_EXECUTE` → `EXECUTING`
**Fields Changed:**
- `status` → `EXECUTING`
- `started_at` → Current timestamp
- `updated_at` → Current timestamp

### 5. Tool Step Execution Completes
**State:** `EXECUTING` → `COMPLETED`
**Fields Changed:**
- `status` → `COMPLETED`
- `execution_result` → Tool execution results
- `completed_at` → Current timestamp
- `updated_at` → Current timestamp

---

## Asset State Changes During Happy Path

### Asset Creation (From Hop Proposals)
**State:** `PROPOSED` → `PENDING`
**Fields Changed:**
- `id` → Generated UUID
- `status` → `PENDING`
- `created_at` → Current timestamp
- `updated_at` → Current timestamp

**Trigger:** User accepts hop proposal containing new assets

### Asset Processing
**State:** `PENDING` → `IN_PROGRESS`
**Fields Changed:**
- `status` → `IN_PROGRESS`
- `updated_at` → Current timestamp

**Trigger:** Tool step begins processing the asset

### Asset Completion
**State:** `IN_PROGRESS` → `READY`
**Fields Changed:**
- `status` → `READY`
- `value` → Final asset value/content
- `asset_metadata` → Updated with processing metadata
- `updated_at` → Current timestamp

**Trigger:** Tool step completes successfully

---

## State Coordination Rules

### Mission-Hop Coordination
1. **Hop PROPOSED/READY_TO_RESOLVE** → Mission becomes `BUILDING_HOP`
2. **Hop READY_TO_EXECUTE** → Mission becomes `HOP_READY_TO_EXECUTE`
3. **Hop EXECUTING** → Mission becomes `EXECUTING_HOP`
4. **Hop COMPLETED** → Mission becomes `READY_FOR_NEXT_HOP` (if not final) or `COMPLETED` (if final)

### Hop-ToolStep Coordination
1. **All Tool Steps READY_TO_EXECUTE** → Hop becomes `READY_TO_EXECUTE`
2. **Any Tool Step EXECUTING** → Hop becomes `EXECUTING`
3. **All Tool Steps COMPLETED** → Hop becomes `COMPLETED`

### Asset Availability Rules
1. **Input Assets** → Must be `READY` before tool step can execute
2. **Output Assets** → Become `IN_PROGRESS` when tool step starts
3. **Output Assets** → Become `READY` when tool step completes

---

## Example Happy Path Scenario

### Scenario: Simple Data Analysis Mission

1. **Mission Created**: "Analyze customer data trends"
   - Status: `PROPOSED`
   - Assets: None

2. **User Accepts Mission**
   - Mission Status: `PROPOSED` → `READY_FOR_NEXT_HOP`

3. **AI Proposes First Hop**: "Load customer data"
   - Hop Status: `PROPOSED`
   - Mission Status: `READY_FOR_NEXT_HOP` → `BUILDING_HOP`
   - Assets: Create "customer_data.csv" (status: `PROPOSED`)

4. **User Accepts Hop**
   - Hop Status: `PROPOSED` → `READY_TO_RESOLVE`
   - Asset Status: `PROPOSED` → `PENDING`

5. **AI Implements Hop**
   - Hop Status: `READY_TO_RESOLVE` → `READY_TO_EXECUTE`
   - Mission Status: `BUILDING_HOP` → `HOP_READY_TO_EXECUTE`
   - Tool Steps: Create "load_csv" tool step

6. **User Accepts Implementation**
   - Hop Status: `READY_TO_EXECUTE` → `EXECUTING`
   - Mission Status: `HOP_READY_TO_EXECUTE` → `EXECUTING_HOP`
   - Tool Step Status: `READY_TO_EXECUTE` → `EXECUTING`

7. **Tool Step Completes**
   - Tool Step Status: `EXECUTING` → `COMPLETED`
   - Hop Status: `EXECUTING` → `COMPLETED`
   - Mission Status: `EXECUTING_HOP` → `READY_FOR_NEXT_HOP`
   - Asset Status: `PENDING` → `READY`

8. **Process Repeats for Next Hop** (if not final)

9. **Final Hop Completes**
   - Mission Status: `EXECUTING_HOP` → `COMPLETED`
   - All assets finalized and available in mission_state 