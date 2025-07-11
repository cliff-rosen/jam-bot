# New Status System

This document defines the complete new status system with consistent naming and clear state meanings.

## Mission States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `PROPOSED` | Agent has proposed a mission | User reviews and approves/rejects |
| `APPROVED` | User approved mission, ready for hop building | Agent proposes first hop plan |
| `BUILDING_HOP` | Currently building a hop (planning + implementing) | Agent or user takes next step in hop building |
| `HOP_READY` | Hop is built and ready to execute | User triggers hop execution |
| `EXECUTING_HOP` | Hop is running | Wait for hop completion |
| `COMPLETED` | Mission finished successfully | Terminal state |
| `FAILED` | Mission failed | Terminal state (or retry) |
| `CANCELLED` | Mission cancelled by user | Terminal state |

## Hop States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `PLAN_PROPOSED` | Agent has proposed a high-level plan | User reviews and approves/rejects plan |
| `READY_FOR_IMPLEMENTATION` | User approved plan, ready for implementation | Agent creates detailed implementation |
| `IMPLEMENTATION_PROPOSED` | Agent has created implementation, waiting for approval | User reviews and approves/rejects implementation |
| `READY_FOR_EXECUTION` | User approved implementation, ready to execute | User triggers execution |
| `EXECUTING` | Currently running | Wait for tool steps to complete |
| `COMPLETED` | Finished successfully | Hop is done, mission continues |
| `FAILED` | Failed during execution or implementation | Terminal state (or retry) |
| `CANCELLED` | Cancelled by user | Terminal state |

## Tool Step States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `PROPOSED` | Tool step created during implementation | System configures parameters |
| `READY_TO_CONFIGURE` | Tool selected, needs parameter configuration | System validates and configures |
| `READY_TO_EXECUTE` | Configuration complete, ready to run | Execution begins |
| `EXECUTING` | Tool is running | Wait for completion |
| `COMPLETED` | Tool execution finished successfully | Tool step is done |
| `FAILED` | Tool execution failed | Terminal state (or retry) |
| `CANCELLED` | Cancelled by user or system | Terminal state |

## Asset States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `PROPOSED` | Asset proposed by agent | User accepts/rejects |
| `PENDING` | Asset accepted, waiting for processing | Processing begins |
| `IN_PROGRESS` | Asset being processed/generated | Processing completes |
| `READY` | Asset available for use | Asset can be used |
| `ERROR` | Asset processing failed | Terminal state (or retry) |
| `EXPIRED` | Asset TTL exceeded | Terminal state |

---

## Complete State Transition Validation

### Mission Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `PROPOSED` | Agent proposes mission | ✅ |
| `PROPOSED` | `APPROVED` | User approves mission | ✅ |
| `APPROVED` | `BUILDING_HOP` | Agent proposes hop plan | ✅ |
| `BUILDING_HOP` | `HOP_READY` | User approves hop implementation | ✅ |
| `HOP_READY` | `EXECUTING_HOP` | User starts hop execution | ✅ |
| `EXECUTING_HOP` | `APPROVED` | Non-final hop completes | ✅ |
| `EXECUTING_HOP` | `COMPLETED` | Final hop completes | ✅ |
| `EXECUTING_HOP` | `FAILED` | Hop fails | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Hop Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `PLAN_PROPOSED` | Agent proposes hop plan | ✅ |
| `PLAN_PROPOSED` | `READY_FOR_IMPLEMENTATION` | User approves plan | ✅ |
| `READY_FOR_IMPLEMENTATION` | `IMPLEMENTATION_PROPOSED` | Agent completes implementation | ✅ |
| `IMPLEMENTATION_PROPOSED` | `READY_FOR_EXECUTION` | User approves implementation | ✅ |
| `READY_FOR_EXECUTION` | `EXECUTING` | User starts execution | ✅ |
| `EXECUTING` | `COMPLETED` | All tool steps complete | ✅ |
| `EXECUTING` | `FAILED` | Tool step fails | ✅ |
| `READY_FOR_IMPLEMENTATION` | `FAILED` | Implementation fails | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Tool Step Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `PROPOSED` | Tool step created | ✅ |
| `PROPOSED` | `READY_TO_CONFIGURE` | Tool selected | ✅ |
| `READY_TO_CONFIGURE` | `READY_TO_EXECUTE` | Configuration complete | ✅ |
| `READY_TO_EXECUTE` | `EXECUTING` | Execution starts | ✅ |
| `EXECUTING` | `COMPLETED` | Execution completes | ✅ |
| `EXECUTING` | `FAILED` | Execution fails | ✅ |
| `READY_TO_CONFIGURE` | `FAILED` | Configuration fails | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Asset Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `PROPOSED` | Asset proposed | ✅ |
| `PROPOSED` | `PENDING` | Asset accepted | ✅ |
| `PENDING` | `IN_PROGRESS` | Processing starts | ✅ |
| `IN_PROGRESS` | `READY` | Processing completes | ✅ |
| `IN_PROGRESS` | `ERROR` | Processing fails | ✅ |
| `READY` | `ERROR` | Asset corrupted | ✅ |
| Any | `EXPIRED` | TTL exceeded | ✅ |

---

## State Coordination Rules

### Mission-Hop Coordination

| Mission State | Valid Hop States | Rule |
|---------------|------------------|------|
| `APPROVED` | *No hop* | Ready for first hop |
| `BUILDING_HOP` | `PLAN_PROPOSED`, `READY_FOR_IMPLEMENTATION`, `IMPLEMENTATION_PROPOSED` | Hop being built |
| `HOP_READY` | `READY_FOR_EXECUTION` | Hop ready to run |
| `EXECUTING_HOP` | `EXECUTING` | Hop running |
| `COMPLETED` | `COMPLETED` | Final hop done |

### Hop-Tool Step Coordination

| Hop State | Valid Tool Step States | Rule |
|-----------|------------------------|------|
| `PLAN_PROPOSED` | *No steps* | Plan only, no implementation |
| `READY_FOR_IMPLEMENTATION` | *No steps* | Ready for agent to create steps |
| `IMPLEMENTATION_PROPOSED` | `PROPOSED`, `READY_TO_CONFIGURE`, `READY_TO_EXECUTE` | Implementation created |
| `READY_FOR_EXECUTION` | `READY_TO_EXECUTE` | All steps ready |
| `EXECUTING` | `EXECUTING`, `COMPLETED` | Steps running/done |
| `COMPLETED` | `COMPLETED` | All steps done |

---

## Missing Transitions Addressed ✅

1. **Hop Implementation Proposal** → `IMPLEMENTATION_PROPOSED` state added
2. **User Rejection Paths** → Need to add rejection transitions
3. **Retry Mechanisms** → Need to add retry transitions
4. **Error Recovery** → Need to add recovery transitions

## Additional Needed Transitions

### Rejection Transitions
- `PLAN_PROPOSED` → `PLAN_REJECTED` → Back to mission planning
- `IMPLEMENTATION_PROPOSED` → `IMPLEMENTATION_REJECTED` → Back to `READY_FOR_IMPLEMENTATION`

### Retry Transitions
- `FAILED` → `RETRY_REQUESTED` → Back to appropriate previous state
- `ERROR` → `RETRY_REQUESTED` → Back to appropriate previous state

Should we add these rejection and retry states? 