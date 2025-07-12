# State Transition Service - Unified Interface

## Overview

The `StateTransitionService` provides a **single, unified interface** for all mission state transitions:

```python
result = await state_service.updateState(transaction_type, data)
```

This eliminates the coordination complexity identified in the frontend/backend transition analysis by providing one method that handles any state transition atomically.

## Transaction Types

All state transitions use the same interface with different transaction types:

### Mission Lifecycle
- `propose_mission` - Agent proposes mission → AWAITING_APPROVAL
- `accept_mission` - User accepts mission → IN_PROGRESS

### Hop Lifecycle  
- `propose_hop_plan` - Agent proposes hop plan → HOP_PLAN_PROPOSED
- `accept_hop_plan` - User accepts hop plan → HOP_PLAN_READY
- `propose_hop_impl` - Agent proposes implementation → HOP_IMPL_PROPOSED
- `accept_hop_impl` - User accepts implementation → HOP_IMPL_READY
- `execute_hop` - User triggers execution → EXECUTING
- `complete_hop` - System completes hop → COMPLETED

### Mission Completion
- `complete_mission` - System completes mission → COMPLETED

## Usage Examples

### 1. Agent Proposes Mission
```python
result = await state_service.updateState("propose_mission", {
    "user_id": user_id,
    "mission": {
        "name": "Newsletter Automation",
        "goal": "Create automated newsletter system",
        "description": "Build system to collect content and send newsletters",
        "success_criteria": ["Newsletter system operational"]
    }
})

# Returns: {"success": True, "mission_id": "...", "status": "AWAITING_APPROVAL"}
```

### 2. User Accepts Mission
```python
result = await state_service.updateState("accept_mission", {
    "user_id": user_id,
    "mission_id": mission_id
})

# Returns: {"success": True, "mission_id": "...", "status": "IN_PROGRESS"}
```

### 3. Agent Proposes Hop Plan
```python
result = await state_service.updateState("propose_hop_plan", {
    "user_id": user_id,
    "mission_id": mission_id,
    "hop": {
        "name": "Setup Email Integration",
        "description": "Configure email API and content sources",
        "sequence_order": 1,
        "is_final": False
    }
})

# Returns: {"success": True, "hop_id": "...", "status": "HOP_PLAN_PROPOSED"}
```

### 4. Complete Hop (with Asset Promotion)
```python
result = await state_service.updateState("complete_hop", {
    "user_id": user_id,
    "hop_id": hop_id,
    "execution_result": {"status": "success", "assets_created": 2}
})

# Returns: {
#   "success": True, 
#   "hop_status": "COMPLETED",
#   "mission_status": "IN_PROGRESS",  # or "COMPLETED" if final hop
#   "is_final": False
# }
```

## Architecture Benefits

### Before: Multiple Methods, Complex Coordination ❌
```python
# Old complex approach
hop_id, hop = await state_service.create_hop_and_link_mission(...)
mission, hop = await state_service.complete_hop_and_update_mission(...)
tool_step, hop_state = await state_service.execute_tool_step_with_coordination(...)
```

### After: Single Unified Interface ✅
```python
# New simple approach
result = await state_service.updateState("propose_hop_plan", data)
result = await state_service.updateState("complete_hop", data)
result = await state_service.updateState("execute_hop", data)
```

## Integration Patterns

### 1. Chat Message Routing
```python
async def handle_chat_message(db: Session, message_type: str, data: Dict[str, Any]):
    """Route chat messages to state transitions"""
    state_service = StateTransitionService(db)
    
    # Map chat messages to transaction types
    message_to_transaction = {
        "create_mission": "propose_mission",
        "approve_mission": "accept_mission", 
        "create_hop": "propose_hop_plan",
        "approve_hop_plan": "accept_hop_plan",
        "start_implementation": "propose_hop_impl",
        "approve_implementation": "accept_hop_impl",
        "execute_hop": "execute_hop"
    }
    
    transaction_type = message_to_transaction.get(message_type)
    if not transaction_type:
        return {"error": f"Unknown message type: {message_type}"}
    
    try:
        result = await state_service.updateState(transaction_type, data)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### 2. Simple API Endpoint
```python
@app.post("/api/state-transition")
async def state_transition_endpoint(
    transaction_type: str,
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Single endpoint for all state transitions"""
    state_service = StateTransitionService(db)
    
    try:
        result = await state_service.updateState(transaction_type, data)
        return {"success": True, **result}
    except StateTransitionError as e:
        return {"success": False, "error": str(e)}
```

### 3. Agent Workflow Integration
```python
async def agent_workflow(db: Session, mission_id: str, user_id: int):
    """Agent completes full hop workflow"""
    state_service = StateTransitionService(db)
    
    # Propose hop plan
    hop_result = await state_service.updateState("propose_hop_plan", {
        "user_id": user_id,
        "mission_id": mission_id,
        "hop": {"name": "AI Generated Hop", "sequence_order": 1}
    })
    
    # Propose implementation (after user approval)
    impl_result = await state_service.updateState("propose_hop_impl", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id'],
        "tool_steps": [...]
    })
    
    return {"hop_proposed": hop_result, "implementation_proposed": impl_result}
```

## Complete Workflow Example

```python
async def complete_mission_workflow(db: Session, user_id: int):
    """Complete mission workflow using unified interface"""
    state_service = StateTransitionService(db)
    
    # 1. Agent proposes mission
    mission_result = await state_service.updateState("propose_mission", {
        "user_id": user_id,
        "mission": {"name": "Newsletter Automation", "goal": "..."}
    })
    
    # 2. User accepts mission
    await state_service.updateState("accept_mission", {
        "user_id": user_id,
        "mission_id": mission_result['mission_id']
    })
    
    # 3. Agent proposes hop plan
    hop_result = await state_service.updateState("propose_hop_plan", {
        "user_id": user_id,
        "mission_id": mission_result['mission_id'],
        "hop": {"name": "Setup Email", "sequence_order": 1}
    })
    
    # 4. User accepts hop plan
    await state_service.updateState("accept_hop_plan", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id']
    })
    
    # 5. Agent proposes implementation
    await state_service.updateState("propose_hop_impl", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id'],
        "tool_steps": [{"tool_id": "email_setup", ...}]
    })
    
    # 6. User accepts implementation
    await state_service.updateState("accept_hop_impl", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id']
    })
    
    # 7. User triggers execution
    await state_service.updateState("execute_hop", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id']
    })
    
    # 8. System completes hop
    completion_result = await state_service.updateState("complete_hop", {
        "user_id": user_id,
        "hop_id": hop_result['hop_id'],
        "execution_result": {"status": "success"}
    })
    
    print(f"Workflow completed! Mission status: {completion_result['mission_status']}")
```

## Atomic Operations

Each `updateState()` call is atomic and handles:

1. **State Validation** - Ensures valid transitions
2. **Entity Updates** - Updates all related entities in single transaction  
3. **Asset Management** - Creates/promotes assets as needed
4. **Error Handling** - Automatic rollback on any failure
5. **Consistency** - Maintains data integrity across all entities

## Error Handling

```python
try:
    result = await state_service.updateState("propose_hop_plan", data)
    print(f"✅ Success: {result['message']}")
except StateTransitionError as e:
    print(f"❌ State transition failed: {e}")
    # System remains in consistent state (automatic rollback)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
```

## Data Contracts

### Input Data Structure
Each transaction type expects specific data:

```python
# propose_mission
{"user_id": int, "mission": MissionData}

# accept_mission  
{"user_id": int, "mission_id": str}

# propose_hop_plan
{"user_id": int, "mission_id": str, "hop": HopData}

# complete_hop
{"user_id": int, "hop_id": str, "execution_result": Optional[Dict]}
```

### Output Data Structure
All transactions return consistent format:

```python
{
    "success": bool,
    "message": str,
    # Transaction-specific fields
    "mission_id": str,     # mission operations
    "hop_id": str,         # hop operations  
    "status": str,         # current status
    # Additional fields as needed
}
```

## Benefits

### 1. **Simplicity**
- Single method for all state transitions
- Consistent interface across all operations
- Easy to learn and use

### 2. **Reliability** 
- Atomic transactions with automatic rollback
- Built-in state validation
- Consistent error handling

### 3. **Maintainability**
- Centralized state transition logic
- Single place to add new transaction types
- Clear separation of concerns

### 4. **Integration**
- Easy to integrate with existing code
- Simple API endpoint creation
- Straightforward chat message routing

## Migration from Complex Approach

### Old Way (Complex)
```python
# Multiple specialized methods
hop_id, hop = await state_service.create_hop_and_link_mission(mission_id, user_id, hop_data)
mission, hop = await state_service.complete_hop_and_update_mission(hop_id, user_id)
```

### New Way (Simple)
```python
# Single unified interface
hop_result = await state_service.updateState("propose_hop_plan", data)
completion_result = await state_service.updateState("complete_hop", data)
```

The unified interface provides the same atomic coordination with a much simpler, more maintainable API. 