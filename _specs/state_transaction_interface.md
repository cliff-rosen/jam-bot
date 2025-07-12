# State Transaction Interface

## Problem Statement

Multiple state transitions require coordinated updates across Mission, Hop, ToolStep, and Asset entities. Currently, these updates are scattered across different services and may not be atomic, leading to potential inconsistency.

## Coordinated Update Transitions

Based on the state transition analysis, these transitions require multi-entity coordination:

### Mission-Level Coordination
- **Step 2.1, 3.1**: User requests hop plan
  - Create new Hop (status=HOP_PLAN_STARTED)
  - Update Mission.current_hop_id
  - Initialize hop assets from mission state

- **Step 2.8**: First hop completes
  - Update Hop.status = COMPLETED
  - Reset Mission.current_hop_id = null
  - Promote hop output assets to mission state

- **Step 3.8**: Final hop completes (mission completion)
  - Update Hop.status = COMPLETED
  - Update Mission.status = COMPLETED
  - Finalize all mission assets

### Hop-Level Coordination
- **Step 2.7, 3.7**: User executes hop
  - Update Hop.status = EXECUTING
  - Initialize ToolStep executions
  - Prepare hop assets for tool processing

- **Tool execution completion**: 
  - Update ToolStep.status = COMPLETED
  - Update affected Assets
  - Check if all tool steps complete → update Hop.status

### Asset State Coordination
Throughout hop execution:
- Tool steps update asset status and content
- Asset role changes (input → intermediate → output)
- Asset promotion from hop scope to mission scope

## Proposed Solution: StateTransactionService

```python
class StateTransactionService:
    """
    Unified interface for all state transitions that require 
    coordinated updates across multiple entities.
    """
    
    def transition_mission_state(
        self, 
        mission_id: str, 
        transition: MissionTransition,
        context: TransitionContext
    ) -> TransitionResult:
        """
        Execute mission-level state transitions with full coordination.
        """
        
    def transition_hop_state(
        self, 
        hop_id: str, 
        transition: HopTransition,
        context: TransitionContext  
    ) -> TransitionResult:
        """
        Execute hop-level state transitions with coordination.
        """
        
    def execute_coordinated_transition(
        self,
        transaction: CoordinatedTransaction
    ) -> TransitionResult:
        """
        Execute complex transitions involving multiple entities.
        """
```

### Transaction Types

```python
@dataclass
class CoordinatedTransaction:
    transaction_type: TransactionType
    primary_entity_id: str
    updates: List[EntityUpdate]
    validations: List[StateValidation]
    rollback_plan: RollbackPlan

class TransactionType(Enum):
    CREATE_HOP = "create_hop"
    COMPLETE_HOP = "complete_hop"  
    COMPLETE_MISSION = "complete_mission"
    EXECUTE_HOP = "execute_hop"
    COMPLETE_TOOL_STEP = "complete_tool_step"

@dataclass  
class EntityUpdate:
    entity_type: EntityType  # Mission, Hop, ToolStep, Asset
    entity_id: str
    field_updates: Dict[str, Any]
    new_status: Optional[str] = None
```

## Benefits

### 1. **Atomic Operations**
- All related updates happen in single database transaction
- Either all succeed or all rollback
- No partial state corruption

### 2. **State Validation**
- Validate all state transitions before executing
- Prevent invalid state combinations
- Enforce business rules consistently

### 3. **Centralized Logic**
- Single place to understand complex state transitions
- Easier testing and debugging
- Consistent error handling

### 4. **Audit Trail**
- Log all state transitions with full context
- Track what triggered each change
- Enable state transition analysis

### 5. **Error Recovery**
- Well-defined rollback procedures
- Clear error messages for chat responses
- Retry mechanisms for transient failures

## Implementation Strategy

### Phase 1: Core Transitions
Implement for the most critical coordinated updates:
1. Hop creation (Steps 2.1, 3.1)
2. Hop completion (Steps 2.8, 3.8)
3. Mission completion (Step 3.8)

### Phase 2: Tool Execution
Add coordination for:
1. Hop execution start
2. Tool step completion
3. Asset state management

### Phase 3: Advanced Features
1. State validation rules engine
2. Complex rollback scenarios  
3. Performance optimization

## Integration with Chat System

The transaction service integrates cleanly with the chat-first architecture:

```python
# In chat message processing
async def handle_create_hop_request(message: ChatMessage) -> ChatResponse:
    try:
        result = await state_transaction_service.transition_mission_state(
            mission_id=message.mission_id,
            transition=MissionTransition.CREATE_HOP,
            context=TransitionContext(
                user_id=message.user_id,
                chat_message_id=message.id,
                requested_action="create_hop"
            )
        )
        
        # Stream success response
        return ChatResponse.success(
            message="Creating hop plan...",
            hop_id=result.created_hop_id
        )
        
    except StateTransitionError as e:
        # Stream error response  
        return ChatResponse.error(
            message=f"Unable to create hop: {e.user_message}",
            error_code=e.code
        )
```

## Database Transaction Patterns

### Simple State Update
```sql
BEGIN TRANSACTION;
UPDATE hops SET status = 'HOP_PLAN_PROPOSED' WHERE id = ?;
COMMIT;
```

### Coordinated Update (Hop Creation)
```sql
BEGIN TRANSACTION;
INSERT INTO hops (id, mission_id, status, ...) VALUES (...);
UPDATE missions SET current_hop_id = ? WHERE id = ?;
INSERT INTO assets (hop assets copied from mission state);
COMMIT;
```

### Complex Coordination (Mission Completion)
```sql
BEGIN TRANSACTION;
UPDATE hops SET status = 'COMPLETED' WHERE id = ?;
UPDATE missions SET status = 'COMPLETED' WHERE id = ?;
UPDATE assets SET scope_type = 'mission' WHERE scope_id = ? AND role = 'output';
COMMIT;
```

## Error Handling Strategy

### Validation Errors
- Check state transition validity before execution
- Return clear error messages for chat responses
- Suggest valid next actions

### Database Errors
- Automatic rollback on any failure
- Log technical details for debugging
- Return user-friendly error messages

### Consistency Errors
- Detect and repair inconsistent states
- Alert on data integrity issues
- Provide manual recovery tools

## Monitoring and Observability

### Transaction Metrics
- Success/failure rates by transaction type
- Average execution time
- Rollback frequency and causes

### State Consistency Checks
- Regular validation of entity relationships
- Detection of orphaned records
- Consistency repair procedures

### Audit Logging
- Full transaction history
- State change attribution
- Performance analysis data

This unified transaction interface would eliminate the coordination complexity identified in the analysis while maintaining the clean chat-centric architecture.