# State Transition Master Table

This is the comprehensive reference for all state transitions in the system, consolidating implementation status, entity updates, triggers, and business rules.

## Master Transition Table

| Step | Transition | Status | Trigger | Caller | User Session | Mission | Hop | Tool Step | Asset | Business Rules |
|------|------------|--------|---------|---------|-------------|---------|-----|-----------|-------|:---------------|
| **1.1** | PROPOSE_MISSION | ✅ IMPLEMENTED | Agent completes mission planning | `mission_specialist_node` in primary_agent.py | Links mission to active session | Creates with `status=AWAITING_APPROVAL` | No changes | No changes | Creates mission-scoped assets | Mission created in approval state, linked to user session |
| **1.2** | ACCEPT_MISSION | ✅ IMPLEMENTED | User clicks "Approve Mission" button | `acceptMissionProposal()` → stateTransitionApi.acceptMission() | No changes | Updates `status=IN_PROGRESS` | No changes | No changes | No changes | Mission approved by user, ready for hop planning |
| **2.1** | START_HOP_PLAN | ❌ NOT IMPLEMENTED | User requests hop planning via chat | User message → `hop_designer_node` | No changes | Sets `current_hop_id=hop_id` | Creates with `status=HOP_PLAN_STARTED` | No changes | Selective asset initialization | User initiates hop planning. Hop created in started state. Agent begins planning |
| **2.2** | PROPOSE_HOP_PLAN | ❌ NOT IMPLEMENTED | Agent completes hop design | `hop_designer_node` → stateTransitionApi.proposeHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_PROPOSED` | No changes | No changes | Agent completes design and proposes to user. Hop moves to proposed state |
| **2.3** | ACCEPT_HOP_PLAN | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY` | No changes | No changes | User approves hop plan. Ready for implementation |
| **2.4** | START_HOP_IMPL | ❌ NOT IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` | No changes | No changes | Updates `status=HOP_IMPL_STARTED` | No changes | No changes | User initiates implementation. Agent begins creating tool steps |
| **2.5** | PROPOSE_HOP_IMPL | ❌ NOT IMPLEMENTED | Agent completes implementation design | `hop_implementer_node` → stateTransitionApi.proposeHopImpl() | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED` | Creates tool steps with `status=PROPOSED` | No changes | Agent proposes executable tool steps. Implementation ready for approval |
| **2.6** | ACCEPT_HOP_IMPL | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY` | Updates all steps to `READY_TO_EXECUTE` | No changes | User approves implementation. All tool steps ready for execution |
| **2.7** | EXECUTE_HOP | ❌ NOT IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING` | Updates first step to `EXECUTING` | No changes | Hop execution begins. Sequential tool step execution starts |
| **2.8** | EXECUTE_TOOL_STEP | ❌ NOT IMPLEMENTED | Tool execution engine runs step | Tool engine → stateTransitionApi.executeToolStep() | No changes | No changes | No changes | Executes tool → updates `status=COMPLETED` | **Updates target assets with tool outputs** | Individual tool execution with asset updates. Maps outputs to assets |
| **2.9** | COMPLETE_HOP | ❌ NOT IMPLEMENTED | All tool steps completed | Tool engine → stateTransitionApi.completeHop() | No changes | If final: `status=COMPLETED` | Updates `status=COMPLETED` | All steps verified `COMPLETED` | Promotes hop outputs to mission scope | Hop completion. Asset promotion. Final hops complete mission |
| **3.1** | START_SECOND_HOP_PLAN | ❌ NOT IMPLEMENTED | User requests next hop via chat | User message → `hop_designer_node` | No changes | Sets `current_hop_id=new_hop_id` | Creates with `status=HOP_PLAN_STARTED` | No changes | Same selective asset initialization | User initiates second hop planning. Same as 2.1 with incremented sequence |
| **3.2** | PROPOSE_SECOND_HOP_PLAN | ❌ NOT IMPLEMENTED | Agent completes hop design | `hop_designer_node` → stateTransitionApi.proposeHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_PROPOSED` | No changes | No changes | Agent proposes second hop design. Same as 2.2 |
| **3.3** | ACCEPT_SECOND_HOP_PLAN | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY` | No changes | No changes | User approves second hop plan. Same as 2.3 |
| **3.4** | START_SECOND_HOP_IMPL | ❌ NOT IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` | No changes | No changes | Updates `status=HOP_IMPL_STARTED` | No changes | No changes | User initiates second hop implementation. Same as 2.4 |
| **3.5** | PROPOSE_SECOND_HOP_IMPL | ❌ NOT IMPLEMENTED | Agent completes implementation design | `hop_implementer_node` → stateTransitionApi.proposeHopImpl() | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED` | Creates tool steps with `status=PROPOSED` | No changes | Agent proposes second hop implementation. Same as 2.5 |
| **3.6** | ACCEPT_SECOND_HOP_IMPL | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY` | Updates all steps to `READY_TO_EXECUTE` | No changes | User approves second hop implementation. Same as 2.6 |
| **3.7** | EXECUTE_SECOND_HOP | ❌ NOT IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING` | Updates first step to `EXECUTING` | No changes | Second hop execution begins. Same as 2.7 |
| **3.8** | EXECUTE_SECOND_HOP_TOOL_STEPS | ❌ NOT IMPLEMENTED | Tool execution engine runs steps | Tool engine → stateTransitionApi.executeToolStep() | No changes | No changes | No changes | Sequential execution of all steps | Updates target assets with tool outputs | Individual tool execution for second hop. Same as 2.8 |
| **3.9** | COMPLETE_SECOND_HOP (Final) | ❌ NOT IMPLEMENTED | All tool steps completed (final hop) | Tool engine → stateTransitionApi.completeHop() | No changes | Updates `status=COMPLETED` (mission complete) | Updates `status=COMPLETED` | All steps verified `COMPLETED` | Promotes final hop outputs, completes mission outputs | Final hop completion triggers mission completion. Asset promotion completes mission |

## Implementation Status Summary

- **✅ Implemented (5/21 transitions): 23.8%**
- **❌ Not Implemented (16/21 transitions): 76.2%**

## Critical Missing Implementations

### Execution System (Steps 2.7, 3.7)
- **Frontend**: "Start Execution" button needs to call `stateTransitionApi.executeHop()`
- **Backend**: `_execute_hop()` method implemented but needs frontend integration
- **Business Rule**: Only hops with `HOP_IMPL_READY` status can start execution

### Completion System (Steps 2.8, 3.8)
- **Tool Execution Engine**: Needs to call `stateTransitionApi.completeHop()` when all steps done
- **Backend**: `_complete_hop()` method implemented but needs tool execution integration
- **Business Rule**: All tool steps must be `COMPLETED` before hop can complete

## Key Business Rules

### Status Validation
- All transitions validate current status before allowing state change
- Invalid status transitions throw `StateTransitionError` and rollback transaction

### Asset Scoping
- **Mission Assets**: Available across entire mission lifecycle
- **Hop Assets**: Scoped to individual hop, promoted to mission on completion
- **Asset Promotion**: Hop output assets become mission assets when hop completes

### Sequential Execution
- Tool steps execute sequentially within a hop
- Next step only starts when current step completes
- Hop completes only when all tool steps are completed

### Mission Completion
- Non-final hops: Clear `current_hop_id` for next hop
- Final hops: Mark mission as `COMPLETED`
- Asset promotion ensures mission outputs are populated

## Transaction Guarantees

- **Atomicity**: All entity updates within a transition commit together or rollback completely
- **Consistency**: Status transitions respect state machine rules
- **Isolation**: Database transactions prevent concurrent modification conflicts
- **Durability**: All changes persist with proper timestamps and metadata