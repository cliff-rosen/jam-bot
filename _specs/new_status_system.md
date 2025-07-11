# New Status System

This document defines the complete new status system with simplified mission states and detailed hop workflow states.

## Naming Philosophy

**Mission Level**: Simple states reflecting overall mission lifecycle
**Hop Level**: Detailed workflow states for when mission is in progress

## Mission States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `AWAITING_APPROVAL` | Agent has proposed a mission | User reviews and approves/rejects |
| `IN_PROGRESS` | User approved mission, work is happening | All work happens at hop level |
| `COMPLETED` | Mission finished successfully | Terminal state |
| `FAILED` | Mission failed | Terminal state (or retry) |
| `CANCELLED` | Mission cancelled by user | Terminal state |

## Hop States (When Mission is IN_PROGRESS)

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| *No current hop* | Mission ready for next hop | Agent starts planning next hop |
| `HOP_PLAN_STARTED` | Agent is working on creating the plan | Agent completes plan |
| `HOP_PLAN_PROPOSED` | Agent finished plan, waiting for user acceptance | User approves/rejects plan |
| `HOP_PLAN_READY` | User accepted plan, ready to start implementation | Agent starts implementation |
| `HOP_IMPL_STARTED` | Agent is working on implementation | Agent completes implementation |
| `HOP_IMPL_PROPOSED` | Agent finished implementation, waiting for user acceptance | User approves/rejects implementation |
| `HOP_IMPL_READY` | User accepted implementation, ready to execute | User triggers execution |
| `EXECUTING` | Hop is running | Wait for tool steps to complete |
| `COMPLETED` | Hop finished successfully | Mission continues or completes |
| `FAILED` | Hop failed during execution or implementation | Terminal state (or retry) |
| `CANCELLED` | Hop cancelled by user | Terminal state |

## Tool Step States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `AWAITING_CONFIGURATION` | Tool step created during implementation | System configures parameters |
| `READY_TO_CONFIGURE` | Tool selected, needs parameter configuration | System validates and configures |
| `READY_TO_EXECUTE` | Configuration complete, ready to run | Execution begins |
| `EXECUTING` | Tool is running | Wait for completion |
| `COMPLETED` | Tool execution finished successfully | Tool step is done |
| `FAILED` | Tool execution failed | Terminal state (or retry) |
| `CANCELLED` | Cancelled by user or system | Terminal state |

## Asset States

| State | Description | What Happens Next |
|-------|-------------|-------------------|
| `AWAITING_APPROVAL` | Asset proposed by agent | User accepts/rejects |
| `READY_FOR_PROCESSING` | Asset accepted, waiting for processing | Processing begins |
| `PROCESSING` | Asset being processed/generated | Processing completes |
| `READY` | Asset available for use | Asset can be used |
| `ERROR` | Asset processing failed | Terminal state (or retry) |
| `EXPIRED` | Asset TTL exceeded | Terminal state |

---

## Complete State Transition Validation

### Mission Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `AWAITING_APPROVAL` | Agent proposes mission | ✅ |
| `AWAITING_APPROVAL` | `IN_PROGRESS` | User approves mission | ✅ |
| `IN_PROGRESS` | `COMPLETED` | Final hop completes | ✅ |
| `IN_PROGRESS` | `FAILED` | Hop fails critically | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Hop Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *No hop* | `HOP_PLAN_STARTED` | Agent starts planning | ✅ |
| `HOP_PLAN_STARTED` | `HOP_PLAN_PROPOSED` | Agent completes plan | ✅ |
| `HOP_PLAN_PROPOSED` | `HOP_PLAN_READY` | User approves plan | ✅ |
| `HOP_PLAN_READY` | `HOP_IMPL_STARTED` | Agent starts implementation | ✅ |
| `HOP_IMPL_STARTED` | `HOP_IMPL_PROPOSED` | Agent completes implementation | ✅ |
| `HOP_IMPL_PROPOSED` | `HOP_IMPL_READY` | User approves implementation | ✅ |
| `HOP_IMPL_READY` | `EXECUTING` | User starts execution | ✅ |
| `EXECUTING` | `COMPLETED` | All tool steps complete | ✅ |
| `EXECUTING` | `FAILED` | Tool step fails | ✅ |
| `HOP_IMPL_STARTED` | `FAILED` | Implementation fails | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Tool Step Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `AWAITING_CONFIGURATION` | Tool step created | ✅ |
| `AWAITING_CONFIGURATION` | `READY_TO_CONFIGURE` | Tool selected | ✅ |
| `READY_TO_CONFIGURE` | `READY_TO_EXECUTE` | Configuration complete | ✅ |
| `READY_TO_EXECUTE` | `EXECUTING` | Execution starts | ✅ |
| `EXECUTING` | `COMPLETED` | Execution completes | ✅ |
| `EXECUTING` | `FAILED` | Execution fails | ✅ |
| `READY_TO_CONFIGURE` | `FAILED` | Configuration fails | ✅ |
| Any | `CANCELLED` | User cancels | ✅ |

### Asset Transitions ✅

| From | To | Trigger | Valid? |
|------|----|---------|---------| 
| *None* | `AWAITING_APPROVAL` | Asset proposed | ✅ |
| `AWAITING_APPROVAL` | `READY_FOR_PROCESSING` | Asset accepted | ✅ |
| `READY_FOR_PROCESSING` | `PROCESSING` | Processing starts | ✅ |
| `PROCESSING` | `READY` | Processing completes | ✅ |
| `PROCESSING` | `ERROR` | Processing fails | ✅ |
| `READY` | `ERROR` | Asset corrupted | ✅ |
| Any | `EXPIRED` | TTL exceeded | ✅ |

---

## State Coordination Rules

### Mission-Hop Coordination

| Mission State | Valid Hop States | Rule |
|---------------|------------------|------|
| `AWAITING_APPROVAL` | *No hop* | Mission not yet approved |
| `IN_PROGRESS` | *No hop*, `HOP_PLAN_STARTED`, `HOP_PLAN_PROPOSED`, `HOP_PLAN_READY`, `HOP_IMPL_STARTED`, `HOP_IMPL_PROPOSED`, `HOP_IMPL_READY`, `EXECUTING`, `COMPLETED` | All hop work happens here |
| `COMPLETED` | `COMPLETED` | Final hop done |

### Hop-Tool Step Coordination

| Hop State | Valid Tool Step States | Rule |
|-----------|------------------------|------|
| `HOP_PLAN_STARTED`, `HOP_PLAN_PROPOSED`, `HOP_PLAN_READY` | *No steps* | Planning phase, no implementation |
| `HOP_IMPL_STARTED` | *No steps* | Agent creating implementation |
| `HOP_IMPL_PROPOSED`, `HOP_IMPL_READY` | `AWAITING_CONFIGURATION`, `READY_TO_CONFIGURE`, `READY_TO_EXECUTE` | Implementation created |
| `EXECUTING` | `EXECUTING`, `COMPLETED` | Steps running/done |
| `COMPLETED` | `COMPLETED` | All steps done |

---

## Updated Action → State Mapping

| Action | Mission State | Hop State |
|--------|---------------|-----------|
| Agent proposes mission | `AWAITING_APPROVAL` | *No hop* |
| User approves mission | `IN_PROGRESS` | *No hop* |
| Agent starts hop planning | `IN_PROGRESS` | `HOP_PLAN_STARTED` |
| Agent proposes hop plan | `IN_PROGRESS` | `HOP_PLAN_PROPOSED` |
| User approves hop plan | `IN_PROGRESS` | `HOP_PLAN_READY` |
| Agent starts hop implementation | `IN_PROGRESS` | `HOP_IMPL_STARTED` |
| Agent proposes hop implementation | `IN_PROGRESS` | `HOP_IMPL_PROPOSED` |
| User approves hop implementation | `IN_PROGRESS` | `HOP_IMPL_READY` |
| User executes hop | `IN_PROGRESS` | `EXECUTING` |
| Hop completes (non-final) | `IN_PROGRESS` | `COMPLETED` → *No hop* |
| Hop completes (final) | `COMPLETED` | `COMPLETED` |

---

## Benefits of This System

1. **Simplified Mission States**: Only 3 main states (awaiting, in progress, done)
2. **Detailed Hop Workflow**: All complexity at hop level where it belongs
3. **Clear Separation**: Mission manages overall state, hops manage workflow
4. **Intuitive**: Mission "in progress" means work is happening at hop level
5. **Flexible**: Can handle any number of hops within single mission state

## Missing Transitions Still to Address

1. **Rejection Paths**: User rejecting proposals
2. **Retry Mechanisms**: Recovering from failures
3. **Edit/Revision**: Modifying proposals before approval 