# User Action Architecture Patterns

This document outlines the different patterns for user interactions in the system.

## Two Types of User Actions

### 1. Direct API Call Actions (Approval Actions)
These actions bypass chat and call backend APIs directly:

- **Accept Mission** (step 1.2) - `acceptMissionProposal()`
- **Accept Hop Plan** (step 2.3, 3.3) - `acceptHopProposal()`  
- **Accept Hop Implementation** (step 2.6, 3.6) - `acceptHopImplementationProposal()`

**Architecture Flow:**
```
Frontend Button Click → Direct API Call → Backend StateTransitionService → Database Update → Frontend State Update
```

**Reasoning:** These are simple approval actions that don't require AI processing or chat context.

### 2. Chat-Based Actions (Request Actions)
These actions send messages through the chat system to trigger AI workflows:

- **Start Hop Planning** (step 2.1, 3.1) - Sends "Please help me design a hop plan"
- **Start Hop Implementation** (step 2.4, 3.4) - Sends "Please help me design the implementation plan"
- **Start Hop Execution** (step 2.7, 3.7) - Future implementation (TBD)

**Architecture Flow:**
```
Frontend Button Click → Chat Message → Backend Chat Router → Primary Agent → AI Processing → StateTransitionService → Database Update
```

**Reasoning:** These actions require AI analysis, planning, and content generation.

## Current Design Issues

**Inconsistency:** The mixed approach creates complexity:
- Approval actions are synchronous and immediate
- Request actions are asynchronous and go through AI processing
- Different error handling patterns
- Different state update mechanisms

**Future Consideration:** Consider unifying all user actions through a single interface, but maintain the current approach for now.

## Implementation Requirements

### Direct API Actions Must Use StateTransitionService
All approval actions should call backend endpoints that use StateTransitionService for:
- Atomic transactions
- State validation  
- Consistent error handling
- Proper audit trails

### Chat Actions Should Auto-Send Messages
Request actions should trigger appropriate chat messages that route to the correct AI nodes.

## State Transition Mapping

| User Action | Type | Transaction Type | Frontend Function |
|------------|------|------------------|-------------------|
| Accept Mission | Direct API | `ACCEPT_MISSION` | `acceptMissionProposal()` |
| Accept Hop Plan | Direct API | `ACCEPT_HOP_PLAN` | `acceptHopProposal()` |
| Accept Hop Implementation | Direct API | `ACCEPT_HOP_IMPL` | `acceptHopImplementationProposal()` |
| Request Hop Planning | Chat | `PROPOSE_HOP_PLAN` | `handleStartHopPlanning()` |
| Request Hop Implementation | Chat | `PROPOSE_HOP_IMPL` | `handleStartHopImplementation()` |
| Request Hop Execution | Chat | `EXECUTE_HOP` | TBD |