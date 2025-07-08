# State Transitions Specification

## Overview

This document defines the complete state transition model for Missions, Hops, ToolSteps, and Assets, including the conditions that trigger transitions between states and the actions that occur during each transition.

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

## ToolStep Status Transitions

| Status | Description | Transition IN (Action/Trigger) | Transition OUT (Action/Trigger) |
|--------|-------------|-------------------------------|----------------------------------|
| **PROPOSED** | ToolStep has been created but not yet configured. Initial state. | • ToolStep created during hop design<br/>• User manually creates tool step | • Tool parameters configured → `READY_TO_CONFIGURE`<br/>• Tool step deleted → (deleted)<br/>• User cancels → `CANCELLED` |
| **READY_TO_CONFIGURE** | ToolStep tool selected, ready for parameter mapping. | • Tool selected from `PROPOSED`<br/>• User returns from configuration errors | • Parameter mapping completed → `READY_TO_EXECUTE`<br/>• Configuration fails → `FAILED`<br/>• User requests changes → `PROPOSED`<br/>• User cancels → `CANCELLED` |
| **READY_TO_EXECUTE** | ToolStep fully configured and validated, ready for execution. | • Configuration completed from `READY_TO_CONFIGURE`<br/>• All dependencies satisfied | • Tool execution starts → `EXECUTING`<br/>• Validation fails → `READY_TO_CONFIGURE`<br/>• Dependencies not met → wait state<br/>• User cancels → `CANCELLED` |
| **EXECUTING** | ToolStep is actively running. | • Tool execution initiated from `READY_TO_EXECUTE` | • Tool execution completes successfully → `COMPLETED`<br/>• Tool execution fails → `FAILED`<br/>• User stops execution → `CANCELLED` |
| **COMPLETED** | ToolStep executed successfully, outputs generated. Terminal state. | • Tool execution completed from `EXECUTING`<br/>• Tool manually marked complete | • Tool archived (no transitions) |
| **FAILED** | ToolStep encountered an error during configuration or execution. Terminal state. | • Configuration fails from `READY_TO_CONFIGURE`<br/>• Execution fails from `EXECUTING`<br/>• Validation errors prevent execution | • User fixes issues → `READY_TO_CONFIGURE`<br/>• User cancels → `CANCELLED`<br/>• Tool step deleted → (deleted) |
| **CANCELLED** | ToolStep was cancelled by user before completion. Terminal state. | • User cancels from any active state<br/>• Hop cancelled (cascades to tool steps) | • Tool step deleted → (deleted)<br/>• User resets → `PROPOSED` |

## Asset Status Transitions

| Status | Description | Transition IN (Action/Trigger) | Transition OUT (Action/Trigger) |
|--------|-------------|-------------------------------|----------------------------------|
| **PROPOSED** | Asset has been proposed but not yet accepted into the system. Initial state. | • Asset proposed by AI agent<br/>• User creates asset proposal | • Asset accepted → `PENDING`<br/>• Asset rejected → (deleted)<br/>• User cancels → (deleted) |
| **PENDING** | Asset accepted but not yet processed or ready for use. | • Asset accepted from `PROPOSED`<br/>• Asset created directly as pending | • Processing begins → `IN_PROGRESS`<br/>• Asset marked ready directly → `READY`<br/>• Processing error → `ERROR`<br/>• Asset expires → `EXPIRED` |
| **IN_PROGRESS** | Asset is currently being processed or generated. | • Processing started from `PENDING`<br/>• User initiates processing | • Processing completes successfully → `READY`<br/>• Processing fails → `ERROR`<br/>• User cancels processing → `PENDING`<br/>• Asset expires during processing → `EXPIRED` |
| **READY** | Asset is available and ready for use. Terminal state for successful assets. | • Processing completed from `IN_PROGRESS`<br/>• Asset marked ready from `PENDING`<br/>• Asset data validated | • Asset expires → `EXPIRED`<br/>• Asset corrupted → `ERROR`<br/>• User reprocesses → `IN_PROGRESS` |
| **ERROR** | Asset encountered an error during processing. Terminal error state. | • Processing fails from `IN_PROGRESS`<br/>• Validation fails from `PENDING`<br/>• Asset corruption detected from `READY` | • User fixes issues → `PENDING`<br/>• User reprocesses → `IN_PROGRESS`<br/>• Asset deleted → (deleted) |
| **EXPIRED** | Asset has expired and is no longer valid. Terminal state. | • Asset TTL exceeded from any state<br/>• Asset manually expired by system | • Asset deleted → (deleted)<br/>• User refreshes → `PENDING` |

## Status Relationship Rules

### Mission-Hop Status Coordination

1. **Mission `BUILDING_HOP`** → Current hop must be in `PROPOSED` or `READY_TO_RESOLVE`
2. **Mission `HOP_READY_TO_EXECUTE`** → Current hop must be in `READY_TO_EXECUTE`  
3. **Mission `EXECUTING_HOP`** → Current hop must be in `EXECUTING`
4. **Mission `READY_FOR_NEXT_HOP`** → Previous hop must be `COMPLETED`

### Hop-ToolStep Status Coordination

1. **Hop `READY_TO_EXECUTE`** → All tool steps must be in `READY_TO_EXECUTE`
2. **Hop `EXECUTING`** → At least one tool step must be in `EXECUTING` or `COMPLETED`
3. **Hop `COMPLETED`** → All tool steps must be in `COMPLETED`
4. **Hop `FAILED`** → At least one tool step must be in `FAILED`

### Asset Availability Rules

1. **ToolStep `READY_TO_EXECUTE`** → All input assets must be in `READY` status
2. **ToolStep `EXECUTING`** → Input assets remain `READY`, output assets become `IN_PROGRESS`
3. **ToolStep `COMPLETED`** → Output assets transition to `READY`
4. **ToolStep `FAILED`** → Output assets transition to `ERROR`

### Cascade Rules

1. **Mission cancelled** → All active hops transition to `CANCELLED` → All active tool steps transition to `CANCELLED`
2. **Mission failed** → Current hop transitions to `FAILED` → Current tool steps transition to `FAILED`
3. **Hop cancelled** → All active tool steps transition to `CANCELLED`
4. **Hop failed** → Current tool step transitions to `FAILED`, mission transitions to `FAILED`
5. **Final hop completes** → Mission transitions to `COMPLETED`

## Transition Triggers

### Automated Triggers
- **ToolStep completion** → Hop state advancement
- **Hop completion** → Mission state advancement
- **Asset processing completion** → Asset state advancement
- **Validation failures** → Error states
- **System errors** → Failed states
- **TTL expiration** → Expired states

### User-Initiated Triggers  
- **Accept mission** → From `PROPOSED` to `READY_FOR_NEXT_HOP`
- **Accept hop proposal** → From `READY_FOR_NEXT_HOP` to `BUILDING_HOP`
- **Accept asset proposal** → From `PROPOSED` to `PENDING`
- **Trigger hop execution** → From `HOP_READY_TO_EXECUTE` to `EXECUTING_HOP`
- **Trigger tool execution** → From `READY_TO_EXECUTE` to `EXECUTING`
- **Approve/reject designs** → State transitions based on approval
- **Cancel operations** → Cancelled states
- **Reset entities** → Return to initial states

### AI Agent Triggers
- **Mission proposal** → Create `PROPOSED` mission for user acceptance
- **Hop proposal** → In `READY_FOR_NEXT_HOP`, propose hop to user  
- **Asset proposal** → Create `PROPOSED` asset for user acceptance
- **Hop design completion** → Ready for execution
- **Tool resolution** → Parameter mapping complete
- **Asset processing** → Generate or transform asset content

## Error Handling

### Recoverable Errors
- **Validation failures** → Return to previous valid state
- **Configuration errors** → Return to configuration state
- **User corrections** → Retry from appropriate state
- **Temporary failures** → Retry mechanism with exponential backoff

### Non-Recoverable Errors
- **System failures** → Transition to `FAILED`
- **Resource unavailable** → Transition to `FAILED`  
- **Unhandled exceptions** → Transition to `FAILED`
- **Critical validation errors** → Transition to `FAILED`

## State Persistence

- **Status changes logged** → Audit trail for debugging
- **Transition metadata** → Timestamps, user, reason, error details
- **Error context** → Detailed error information for failed states
- **Recovery information** → Data needed to resume from valid states
- **Dependency tracking** → Asset and tool step dependencies for proper sequencing 