# Complete State Transitions

This document lists every possible state transition for missions and hops, showing the trigger and resulting states.

## Mission State Transitions

| From State | To State | Trigger | Mission Fields Changed | Hop State Impact |
|------------|----------|---------|------------------------|------------------|
| *None* | `PROPOSED` | Agent proposes mission | All fields initialized | None (no hop exists) |
| `PROPOSED` | `READY_FOR_NEXT_HOP` | User accepts mission | `status`, `updated_at` | None (no hop exists) |
| `READY_FOR_NEXT_HOP` | `BUILDING_HOP` | Hop created with `PROPOSED` status | `status`, `updated_at` | None (automatic coordination) |
| `READY_FOR_NEXT_HOP` | `BUILDING_HOP` | Hop status becomes `READY_TO_RESOLVE` | `status`, `updated_at` | None (automatic coordination) |
| `BUILDING_HOP` | `HOP_READY_TO_EXECUTE` | Hop status becomes `READY_TO_EXECUTE` | `status`, `updated_at` | None (automatic coordination) |
| `HOP_READY_TO_EXECUTE` | `EXECUTING_HOP` | Hop status becomes `EXECUTING` | `status`, `updated_at` | None (automatic coordination) |
| `EXECUTING_HOP` | `READY_FOR_NEXT_HOP` | Hop completes (non-final) | `status`, `current_hop_id`, `hops`, `mission_state`, `updated_at` | None (automatic coordination) |
| `EXECUTING_HOP` | `COMPLETED` | Hop completes (final) | `status`, `current_hop_id`, `hops`, `mission_state`, `updated_at` | None (automatic coordination) |
| `EXECUTING_HOP` | `FAILED` | Hop fails | `status`, `updated_at` | None (automatic coordination) |
| Any state | `CANCELLED` | User cancels mission | `status`, `updated_at` | Cascades to hop cancellation |
| Any state | `FAILED` | System error | `status`, `updated_at` | May cascade to hop failure |

## Hop State Transitions

| From State | To State | Trigger | Hop Fields Changed | Mission State Impact |
|------------|----------|---------|-------------------|---------------------|
| *None* | `PROPOSED` | Agent proposes hop | All fields initialized | Mission → `BUILDING_HOP` |
| `PROPOSED` | `READY_TO_RESOLVE` | User accepts hop design | `status`, `updated_at` | Mission stays `BUILDING_HOP` |
| `READY_TO_RESOLVE` | `READY_TO_EXECUTE` | Agent completes implementation | `status`, `is_resolved`, `tool_steps`, `hop_state`, `updated_at` | Mission → `HOP_READY_TO_EXECUTE` |
| `READY_TO_EXECUTE` | `EXECUTING` | User starts hop execution | `status`, `updated_at` | Mission → `EXECUTING_HOP` |
| `EXECUTING` | `COMPLETED` | All tool steps complete | `status`, `hop_state`, `updated_at` | Mission → `READY_FOR_NEXT_HOP` or `COMPLETED` |
| `EXECUTING` | `FAILED` | Tool step fails | `status`, `error_message`, `updated_at` | Mission → `FAILED` |
| `READY_TO_RESOLVE` | `FAILED` | Implementation fails | `status`, `error_message`, `updated_at` | Mission → `FAILED` |
| Any state | `CANCELLED` | User cancels hop | `status`, `updated_at` | Mission → `CANCELLED` |
| Any state | `CANCELLED` | Mission cancelled | `status`, `updated_at` | None (cascaded from mission) |

## Tool Step State Transitions

| From State | To State | Trigger | Tool Step Fields Changed | Hop State Impact |
|------------|----------|---------|-------------------------|------------------|
| *None* | `PROPOSED` | Tool step created | All fields initialized | None |
| `PROPOSED` | `READY_TO_CONFIGURE` | Tool selected | `status`, `updated_at` | None |
| `READY_TO_CONFIGURE` | `READY_TO_EXECUTE` | Configuration complete | `status`, `validation_errors`, `updated_at` | Hop → `READY_TO_EXECUTE` (if all steps ready) |
| `READY_TO_EXECUTE` | `EXECUTING` | Tool execution starts | `status`, `started_at`, `updated_at` | Hop → `EXECUTING` |
| `EXECUTING` | `COMPLETED` | Tool execution completes | `status`, `execution_result`, `completed_at`, `updated_at` | Hop → `COMPLETED` (if all steps complete) |
| `EXECUTING` | `FAILED` | Tool execution fails | `status`, `error_message`, `completed_at`, `updated_at` | Hop → `FAILED` |
| `READY_TO_CONFIGURE` | `FAILED` | Configuration fails | `status`, `error_message`, `updated_at` | Hop → `FAILED` |
| Any state | `CANCELLED` | User cancels | `status`, `updated_at` | May affect hop state |

## Asset State Transitions

| From State | To State | Trigger | Asset Fields Changed | Usage Impact |
|------------|----------|---------|---------------------|--------------|
| *None* | `PROPOSED` | Asset proposed | All fields initialized | Not available for use |
| `PROPOSED` | `PENDING` | Asset accepted | `status`, `updated_at` | Not available for use |
| `PENDING` | `IN_PROGRESS` | Processing starts | `status`, `updated_at` | Not available for use |
| `IN_PROGRESS` | `READY` | Processing completes | `status`, `value`, `asset_metadata`, `updated_at` | Available for use |
| `IN_PROGRESS` | `ERROR` | Processing fails | `status`, `error_message`, `updated_at` | Not available for use |
| `READY` | `ERROR` | Asset corrupted | `status`, `error_message`, `updated_at` | Not available for use |
| Any state | `EXPIRED` | TTL exceeded | `status`, `updated_at` | Not available for use |

## Missing Transitions (Identified Issues)

1. **Hop Implementation Proposal**: No state exists for "AI has proposed implementation, waiting for user approval"
2. **Hop Design Rejection**: No transition for user rejecting hop design
3. **Implementation Rejection**: No transition for user rejecting hop implementation
4. **Hop Retry**: No transition for retrying failed hops
5. **Mission Pause/Resume**: No states for pausing/resuming missions
6. **Partial Hop Completion**: No handling for partially completed hops

## State Coordination Issues

1. **Mission-Hop Timing**: Mission status changes immediately when hop status changes, but user hasn't necessarily approved the change
2. **Asset Availability**: No clear rules for when assets become available during hop execution
3. **Error Recovery**: No clear paths for recovering from failed states
4. **Concurrent Operations**: No handling for multiple hops or parallel operations 