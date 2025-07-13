# State Transition Master Table

This is the comprehensive reference for all state transitions in the system, consolidating implementation status, entity updates, triggers, and business rules.

## Master Transition Table

| Step | Transition | Status | Trigger | Caller | User Session | Mission | Hop | Tool Step | Asset | Business Rules |
|------|------------|--------|---------|---------|-------------|---------|-----|-----------|-------|----------------|
| **1.1** | PROPOSE_MISSION | ✅ IMPLEMENTED | Agent completes mission planning | `mission_specialist_node` in primary_agent.py | Links mission to active session via `link_mission_to_session()` | Creates with `status=AWAITING_APPROVAL`, sets timestamps, core fields | No changes | No changes | Creates mission-scoped assets with `scope_type=mission`, `scope_id=mission_id` | Mission created in approval state, automatically linked to user's active session for workflow continuity |
| **1.2** | ACCEPT_MISSION | ✅ IMPLEMENTED | User clicks "Approve Mission" button | `acceptMissionProposal()` in JamBotContext.tsx → stateTransitionApi.acceptMission() | No changes | Updates `status=IN_PROGRESS`, `updated_at=now()` | No changes | No changes | No changes | Mission approved by user, ready for hop planning. Status validation ensures only awaiting missions can be accepted |
| **2.1** | PROPOSE_HOP_PLAN | ✅ IMPLEMENTED | User requests hop planning via chat | User message → `hop_designer_node` in primary_agent.py | No changes | Sets `current_hop_id=hop_id`, `updated_at=now()` | Creates with `status=HOP_PLAN_PROPOSED`, `mission_id=mission_id`, all core fields from HopLite | No changes | **Selective initialization**: (1) Copies only specified mission assets from `input_asset_ids` to hop scope as inputs, (2) Creates output asset from `output_asset_spec` in hop scope | Hop planning based on specific requirements. Only copies needed mission assets, creates targeted outputs. Mission transitions to having active hop |
| **2.2** | Agent completes hop plan | 🔄 AGENT ONLY | Agent completes hop design | Handled automatically within `hop_designer_node` | No changes | No changes | Agent updates via internal logic (not StateTransitionService) | No changes | No changes | Internal agent process - hop moves from started to proposed state as agent completes planning |
| **2.3** | ACCEPT_HOP_PLAN | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` in JamBotContext.tsx → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY`, `updated_at=now()` | No changes | No changes | User approves hop plan. Status validation ensures only proposed hop plans can be accepted. Hop ready for implementation |
| **2.4** | PROPOSE_HOP_IMPL | ✅ IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` in primary_agent.py | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED`, `updated_at=now()` | Creates tool steps with `hop_id=hop_id`, serialized `parameter_mapping`, `result_mapping`, `resource_configs`, `status=PROPOSED` | No changes | Implementation planning creates executable tool steps. Each step defines how to transform hop inputs to outputs via tool execution |
| **2.5** | Agent completes implementation | 🔄 AGENT ONLY | Agent completes implementation design | Handled automatically within `hop_implementer_node` | No changes | No changes | Agent updates via internal logic (not StateTransitionService) | No changes | No changes | Internal agent process - hop moves from implementation started to proposed state as agent completes implementation planning |
| **2.6** | ACCEPT_HOP_IMPL | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` in JamBotContext.tsx → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY`, `updated_at=now()` | Updates all tool steps from `PROPOSED` to `READY_TO_EXECUTE`, `updated_at=now()` | No changes | User approves implementation plan. All tool steps become ready for execution. Status validation ensures only proposed implementations can be accepted |
| **2.7** | EXECUTE_HOP | ❌ NOT IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` in JamBotContext.tsx → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING`, `updated_at=now()` | Updates **first tool step** from `READY_TO_EXECUTE` to `EXECUTING`, sets `started_at=now()`, `updated_at=now()` | No changes | Hop execution begins with first tool step. Sequential execution ensures one step runs at a time. Status validation ensures only ready implementations can execute |
| **2.8** | COMPLETE_HOP | ❌ NOT IMPLEMENTED | All tool steps completed | Tool execution engine → stateTransitionApi.completeHop() | No changes | If `is_final=true`: `status=COMPLETED`<br>If `is_final=false`: `current_hop_id=null`, `updated_at=now()` | Updates `status=COMPLETED`, `is_resolved=true`, adds execution result to `hop_metadata`, `updated_at=now()` | **Prerequisite**: All tool steps must be `status=COMPLETED` (verified, not changed) | Promotes hop output assets to mission scope: `scope_type=mission`, adds `promoted_from_hop` metadata | Hop completion promotes outputs to mission level. Final hops complete entire mission. Non-final hops prepare for next hop. Asset promotion makes hop results available mission-wide |
| **3.1** | User requests second hop plan | ✅ IMPLEMENTED | User requests next hop via chat | User message → `hop_designer_node` in primary_agent.py | No changes | Sets `current_hop_id=new_hop_id`, `updated_at=now()` | Creates new hop with `status=HOP_PLAN_PROPOSED`, incremented `sequence_order` | No changes | Same selective asset initialization as 2.1 | Same as 2.1 - subsequent hop planning follows identical pattern with incremented sequence order |
| **3.2** | Agent completes second hop plan | 🔄 AGENT ONLY | Agent completes hop design | Handled automatically within `hop_designer_node` | No changes | No changes | Agent updates via internal logic | No changes | No changes | Same as 2.2 - internal agent planning process |
| **3.3** | User approves second hop plan | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` in JamBotContext.tsx → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY`, `updated_at=now()` | No changes | No changes | Same as 2.3 - user approval of hop plan |
| **3.4** | User requests second implementation | ✅ IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` in primary_agent.py | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED`, `updated_at=now()` | Creates tool steps for second hop | No changes | Same as 2.4 - implementation planning for subsequent hop |
| **3.5** | Agent completes second implementation | 🔄 AGENT ONLY | Agent completes implementation design | Handled automatically within `hop_implementer_node` | No changes | No changes | Agent updates via internal logic | No changes | No changes | Same as 2.5 - internal agent implementation process |
| **3.6** | User approves second implementation | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` in JamBotContext.tsx → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY`, `updated_at=now()` | Updates all tool steps to `READY_TO_EXECUTE` | No changes | Same as 2.6 - user approval of implementation plan |
| **3.7** | User triggers second execution | ❌ NOT IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` in JamBotContext.tsx → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING`, `updated_at=now()` | Updates first tool step to `EXECUTING` | No changes | Same as 2.7 - execution start for subsequent hop |
| **3.8** | Final hop execution completes | ❌ NOT IMPLEMENTED | All tool steps completed (final hop) | Tool execution engine → stateTransitionApi.completeHop() | No changes | Updates `status=COMPLETED`, `updated_at=now()` (mission complete) | Updates `status=COMPLETED`, `is_resolved=true`, execution results | All tool steps verified as `COMPLETED` | Promotes final hop outputs to mission, completes mission outputs | Final hop completion triggers mission completion. All mission outputs must be satisfied for successful completion |

## Implementation Status Summary

- **✅ Implemented (12/18 transitions): 66.7%**
- **❌ Not Implemented (4/18 transitions): 22.2%**
- **🔄 Agent Only (2/18 transitions): 11.1%**

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