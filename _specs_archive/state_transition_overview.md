# State Transition System Overview

The state transition system provides a unified interface for all mission and hop **state changes** through the StateTransitionService. This system handles **transitions only** - it does not generate content or design workflows. All mission plans, hop designs, and implementation details must be fully derived before calling the API.

**Critical Distinction:**
- ❌ **Not for content generation**: API does not create mission plans, hop designs, or tool steps
- ✅ **Only for state transitions**: API updates entity status and persists pre-designed content
- ✅ **Atomic persistence**: Ensures validated content is stored with proper state changes

## Architecture

```
Frontend (React) → StateTransitionApi → StateTransitionService → Entity Services → Database
     ↑                    ↑                      ↑                     ↑              ↑
   UI Actions         HTTP REST API         Business Logic      Data Access      Entity Updates
                                                 ↓
                                          AssetService
                                          MissionTransformer  
                                          UserSessionService
```

**Data Flow:**
- **StateTransitionService** orchestrates transactions and validates business rules
- **Entity Services** handle specific data operations and transformations
- **Database** receives atomic updates through entity service abstractions

## Core Components

### 1. StateTransitionService (`backend/services/state_transition_service.py`)
- **Unified Interface**: Single `updateState(transaction_type, data)` method for all transitions
- **Atomic Transactions**: All database changes commit together or rollback completely
- **Status Validation**: Ensures only valid state transitions are allowed
- **Asset Management**: Handles scope-based asset creation, copying, and promotion

### 2. StateTransitionApi (`frontend/src/lib/api/stateTransitionApi.ts`)
- **REST Client**: HTTP interface to StateTransitionService
- **Type Safety**: TypeScript interfaces for all transaction types
- **Error Handling**: Consistent error responses across all transitions

### 3. Transaction Types
Each transition is identified by a `TransactionType` enum:
- `PROPOSE_MISSION`, `ACCEPT_MISSION`
- `PROPOSE_HOP_PLAN`, `ACCEPT_HOP_PLAN`
- `PROPOSE_HOP_IMPL`, `ACCEPT_HOP_IMPL`
- `EXECUTE_HOP`, `COMPLETE_HOP`
- `COMPLETE_MISSION`

## How the API is Consumed

### Frontend Components → StateTransitionApi

**Mission Actions (JamBotContext.tsx):**
```typescript
const acceptMissionProposal = async () => {
    const result = await stateTransitionApi.acceptMission(mission.id);
    if (result.success) {
        dispatch({ type: 'ACCEPT_MISSION_PROPOSAL', payload: updatedMission });
    }
};
```

**Hop Actions (JamBotContext.tsx):**
```typescript
const acceptHopProposal = async (hop: Hop) => {
    const result = await stateTransitionApi.acceptHopPlan(hop.id);
    if (result.success) {
        dispatch({ type: 'ACCEPT_HOP_PROPOSAL', payload: { hop: updatedHop } });
        await loadMission(mission.id); // Refresh to see changes
    }
};
```

**Action Buttons (ActionButtons.tsx):**
```typescript
// User clicks "Approve Mission" button
<button onClick={acceptMissionProposal}>Approve Mission</button>

// User clicks "Accept Hop Plan" button  
<button onClick={() => acceptHopProposal(currentHop)}>Accept Hop Plan</button>

// User clicks "Accept Implementation" button
<button onClick={() => acceptHopImplementationProposal(currentHop)}>Accept Implementation</button>
```

### Agent Nodes → StateTransitionService

**Mission Creation (primary_agent.py):**
```python
result = await _state_transition_service.updateState(
    TransactionType.PROPOSE_MISSION,
    {
        'user_id': _user_id,
        'mission': mission_data
    }
)
```

**Hop Planning (primary_agent.py):**
```python
result = await _state_transition_service.updateState(
    TransactionType.PROPOSE_HOP_PLAN,
    {
        'mission_id': state.mission.id,
        'user_id': _user_id,
        'hop': hop_data
    }
)
```

**Hop Implementation (primary_agent.py):**
```python
result = await _state_transition_service.updateState(
    TransactionType.PROPOSE_HOP_IMPL,
    {
        'hop_id': current_hop.id,
        'user_id': _user_id,
        'tool_steps': tool_steps_data
    }
)
```

## Data Flow Examples

### User Workflow
1. **User sends message** → Chat triggers agent node
2. **Agent completes planning** → Calls StateTransitionService 
3. **Database updated atomically** → Mission/hop/assets created
4. **Frontend refreshes** → User sees updated state
5. **User clicks approval button** → StateTransitionApi called
6. **Status updated** → Workflow continues to next step

### Chat-Triggered Transitions
- User message "I need a hop plan" → `hop_designer_node` → `PROPOSE_HOP_PLAN`
- User message "Design implementation" → `hop_implementer_node` → `PROPOSE_HOP_IMPL`

### Button-Triggered Transitions  
- "Approve Mission" button → `acceptMissionProposal()` → `ACCEPT_MISSION`
- "Accept Hop Plan" button → `acceptHopProposal()` → `ACCEPT_HOP_PLAN`
- "Accept Implementation" button → `acceptHopImplementationProposal()` → `ACCEPT_HOP_IMPL`

## Error Handling

All transitions include comprehensive error handling:

```typescript
try {
    const result = await stateTransitionApi.acceptMission(missionId);
    if (result.success) {
        // Update UI state
    } else {
        console.error('State transition failed:', result.message);
    }
} catch (error) {
    console.error('API call failed:', error);
    // Fallback to local state update
}
```

## Status Validation

Each transition validates the current entity status:
- **Mission**: Must be `AWAITING_APPROVAL` to accept
- **Hop Plan**: Must be `HOP_PLAN_PROPOSED` to accept  
- **Hop Implementation**: Must be `HOP_IMPL_PROPOSED` to accept
- **Hop Execution**: Must be `HOP_IMPL_READY` to start

Invalid transitions throw `StateTransitionError` and rollback the database transaction.

## Related Documentation

**For complete implementation details, see:**
- [`state_transition_master_table.md`](./state_transition_master_table.md) - Comprehensive table with all 18 transitions, entity updates, callers, business rules, and implementation status

The master table provides:
- Step-by-step transition details
- Exact database entity changes for each transition
- Business rule explanations
- Implementation status tracking
- Code location references for all callers