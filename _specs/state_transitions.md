# State Transitions Specification

## Overview

This document defines the complete state transition model for Missions and Hops, including the conditions that trigger transitions between states and the actions that occur during each transition.

## Mission Status Transitions

| Status | Description | Transition IN (Action/Trigger) | Transition OUT (Action/Trigger) |
|--------|-------------|-------------------------------|----------------------------------|
| **PROPOSED** | Mission has been proposed by AI bot and awaiting user acceptance. Initial state. | • Mission proposed by AI bot | • User accepts mission → `READY_FOR_NEXT_HOP`<br/>• System error → `FAILED`<br/>• User cancels → `CANCELLED` |
| **READY_FOR_NEXT_HOP** | Mission accepted, AI bot ready to propose next hop. | • User accepts mission from `PROPOSED`<br/>• Non-final hop completed successfully from `EXECUTING_HOP` | • AI bot proposes hop, user accepts → `BUILDING_HOP`<br/>• System error → `FAILED`<br/>• User cancels → `CANCELLED` |
| **BUILDING_HOP** | AI agent is actively designing the next hop (tools, parameters, etc). | • User accepts hop proposal from `READY_FOR_NEXT_HOP` | • Hop design completed successfully → `HOP_READY_TO_EXECUTE`<br/>• Hop design fails → `FAILED`<br/>• User cancels → `CANCELLED` |
| **HOP_READY_TO_EXECUTE** | Hop has been designed and validated, ready for execution. | • Hop design completed from `BUILDING_HOP`<br/>• User approves hop design | • User triggers execution → `EXECUTING_HOP`<br/>• User rejects hop, needs redesign → `BUILDING_HOP`<br/>• User cancels → `CANCELLED` |
| **EXECUTING_HOP** | Current hop is actively running (tool steps executing). | • Hop execution started from `HOP_READY_TO_EXECUTE` | • Hop completes successfully (final hop) → `COMPLETED`<br/>• Hop completes successfully (not final hop) → `READY_FOR_NEXT_HOP`<br/>• Hop execution fails → `FAILED`<br/>• User cancels execution → `CANCELLED` |
| **COMPLETED** | Mission has achieved its goal successfully. Terminal state. | • Final hop completed from `EXECUTING_HOP`<br/>• Mission goal achieved early | • User resets mission → `PROPOSED` (new mission instance) |
| **FAILED** | Mission encountered an unrecoverable error. Terminal state. | • Hop design fails from `BUILDING_HOP`<br/>• Hop execution fails from `EXECUTING_HOP`<br/>• System error from any state | • User resets mission → `PROPOSED` (new mission instance)<br/>• User cancels → `CANCELLED` |
| **CANCELLED** | Mission was cancelled by user. Terminal state. | • User cancels from any active state | • User resets mission → `PROPOSED` (new mission instance) |

## Hop Status Transitions

| Status | Description | Transition IN (Action/Trigger) | Transition OUT (Action/Trigger) |
|--------|-------------|-------------------------------|----------------------------------|
| **PROPOSED** | Hop has been suggested/created but not yet finalized. Initial state. | • AI agent creates hop during mission planning<br/>• User manually creates hop | • Hop design approved → `READY_TO_RESOLVE`<br/>• Hop rejected/deleted → (deleted)<br/>• User cancels → `CANCELLED` |
| **READY_TO_RESOLVE** | Hop concept approved, ready for tool resolution and parameter mapping. | • Hop proposal accepted from `PROPOSED`<br/>• User manually approves hop concept | • Tool resolution begins → `READY_TO_EXECUTE`<br/>• Tool resolution fails → `FAILED`<br/>• User requests changes → `PROPOSED`<br/>• User cancels → `CANCELLED` |
| **READY_TO_EXECUTE** | Tools mapped, parameters configured, hop fully prepared for execution. | • Tool resolution completed from `READY_TO_RESOLVE`<br/>• All tool steps validated successfully | • Hop execution starts → `EXECUTING`<br/>• Validation fails → `READY_TO_RESOLVE`<br/>• User requests changes → `READY_TO_RESOLVE`<br/>• User cancels → `CANCELLED` |
| **EXECUTING** | Hop is actively running (tool steps executing in sequence). | • Hop execution initiated from `READY_TO_EXECUTE` | • All tool steps complete successfully → `COMPLETED`<br/>• Any tool step fails → `FAILED`<br/>• User stops execution → `CANCELLED` |
| **COMPLETED** | Hop executed successfully, all outputs generated. Terminal state. | • All tool steps completed from `EXECUTING`<br/>• Hop manually marked complete | • Hop archived (no transitions) |
| **FAILED** | Hop encountered an error during resolution or execution. Terminal state. | • Tool resolution fails from `READY_TO_RESOLVE`<br/>• Tool execution fails from `EXECUTING`<br/>• Validation errors prevent execution | • User fixes issues → `READY_TO_RESOLVE`<br/>• User cancels → `CANCELLED`<br/>• Hop deleted → (deleted) |
| **CANCELLED** | Hop was cancelled by user before completion. Terminal state. | • User cancels from any active state<br/>• Mission cancelled (cascades to hops) | • Hop deleted → (deleted)<br/>• User resets → `PROPOSED` |

## Status Relationship Rules

### Mission-Hop Status Coordination

1. **Mission `BUILDING_HOP`** → Current hop must be in `PROPOSED` or `READY_TO_RESOLVE`
2. **Mission `HOP_READY_TO_EXECUTE`** → Current hop must be in `READY_TO_EXECUTE`  
3. **Mission `EXECUTING_HOP`** → Current hop must be in `EXECUTING`
4. **Mission `READY_FOR_NEXT_HOP`** → Previous hop must be `COMPLETED`

### Cascade Rules

1. **Mission cancelled** → All active hops transition to `CANCELLED`
2. **Mission failed** → Current hop transitions to `FAILED` 
3. **Final hop completes** → Mission transitions to `COMPLETED`
4. **Hop fails** → Mission transitions to `FAILED` (unless recoverable)

## Transition Triggers

### Automated Triggers
- **Hop completion** → Mission state advancement
- **Tool execution completion** → Hop state advancement
- **Validation failures** → Error states
- **System errors** → Failed states

### User-Initiated Triggers  
- **Accept mission** → From `PROPOSED` to `READY_FOR_NEXT_HOP`
- **Accept hop proposal** → From `READY_FOR_NEXT_HOP` to `BUILDING_HOP`
- **Trigger hop execution** → From `HOP_READY_TO_EXECUTE` to `EXECUTING_HOP`
- **Approve/reject hop design** → Approve moves to execution, reject returns to design
- **Cancel operations** → Cancelled states
- **Reset mission** → Return to proposed

### AI Agent Triggers
- **Mission proposal** → Create `PROPOSED` mission for user acceptance
- **Hop proposal** → In `READY_FOR_NEXT_HOP`, propose hop to user  
- **Hop design completion** → Ready for execution
- **Tool resolution** → Parameter mapping complete

## Error Handling

### Recoverable Errors
- **Validation failures** → Return to previous valid state
- **User corrections** → Retry from appropriate state
- **Temporary failures** → Retry mechanism

### Non-Recoverable Errors
- **System failures** → Transition to `FAILED`
- **Resource unavailable** → Transition to `FAILED`  
- **Unhandled exceptions** → Transition to `FAILED`

## State Persistence

- **Status changes logged** → Audit trail for debugging
- **Transition metadata** → Timestamps, user, reason
- **Error context** → Detailed error information for failed states
- **Recovery information** → Data needed to resume from valid states 