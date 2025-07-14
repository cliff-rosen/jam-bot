# Primary Agent Node Best Practices

## Overview

This document establishes best practices for implementing primary agent nodes in the system. The primary agent uses a LangGraph-based architecture with specialist nodes that handle different aspects of mission and hop management. Each node operates on shared state, communicates with clients through streaming, and maintains type safety throughout the process.

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Primary Agent Graph                         │
├─────────────────────────────────────────────────────────────────┤
│  Supervisor Node  →  Specialist Nodes  →  Database Services    │
│      ↓                   ↓                      ↓               │
│  State Router      AI Processing        State Persistence      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Client Communication                          │
├─────────────────────────────────────────────────────────────────┤
│  StreamWriter  →  AgentResponse  →  Frontend Updates           │
│      ↓              ↓                    ↓                     │
│  Real-time      Typed Response      UI State Updates           │
└─────────────────────────────────────────────────────────────────┘
```

### Node Types

1. **Supervisor Node**: Routes between specialist nodes based on mission/hop status
2. **Specialist Nodes**: Handle specific AI operations (mission design, hop design, hop implementation)
3. **Execution Nodes**: Handle tool execution and asset processing
4. **Support Nodes**: Handle search, validation, and utility operations

## State Management

### State Schema Definition

The central `State` class uses Pydantic for type safety and validation:

```python
class State(BaseModel):
    """State for the RAVE workflow"""
    messages: List[ChatMessage]
    mission: Optional[Mission] = None
    mission_id: Optional[str] = None
    tool_params: Dict[str, Any] = {}
    next_node: str
    asset_summaries: Dict[str, str] = {}
    
    class Config:
        arbitrary_types_allowed = True
```

### ✅ CORRECT: State Usage Patterns

#### 1. State Initialization
```python
# Initialize with proper types
state = State(
    messages=chat_request.messages,
    mission=mission,
    mission_id=chat_request.mission_id,
    tool_params={},
    next_node="supervisor_node",
    asset_summaries=enriched_payload.get("asset_summaries", {})
)
```

#### 2. State Updates with Immutability
```python
# ✅ Create new state update dict - never mutate original state
state_update = {
    "messages": [*state.messages, new_message.model_dump()],
    "mission": updated_mission,  # New mission object
    "mission_id": state.mission_id,
    "next_node": next_node,
    "tool_params": state.tool_params,
    "asset_summaries": state.asset_summaries
}

# Return Command with update
return Command(goto=next_node, update=state_update)
```

#### 3. Deep Copying for Complex Objects
```python
# ✅ Deep copy when modifying complex objects
def _process_implementation_plan(parsed_response, current_hop):
    # Create a deep copy to avoid mutating the original
    updated_hop = copy.deepcopy(current_hop)
    
    # Make modifications to the copy
    updated_hop.tool_steps = parsed_response.tool_steps
    updated_hop.status = HopStatus.READY_TO_EXECUTE
    
    return updated_hop
```

### ❌ INCORRECT: State Anti-Patterns

#### 1. Direct State Mutation
```python
# DON'T DO THIS - Direct mutation
state.messages.append(new_message)  # Mutates original state
state.mission.current_hop = new_hop  # Mutates original state
```

#### 2. Incomplete State Updates
```python
# DON'T DO THIS - Missing required fields
state_update = {
    "messages": new_messages,
    # Missing mission, mission_id, tool_params, asset_summaries
}
```

#### 3. Shallow Copying Complex Objects
```python
# DON'T DO THIS - Shallow copy can cause mutation issues
updated_hop = current_hop.copy()  # Use copy.deepcopy() instead
```

## Client Communication

### StreamWriter Pattern

Every agent node receives a `StreamWriter` for real-time client communication:

```python
async def mission_specialist_node(
    state: State, 
    writer: StreamWriter, 
    config: Dict[str, Any]
) -> AsyncIterator[Dict[str, Any]]:
```

### ✅ CORRECT: Client Communication Patterns

#### 1. Status Updates
```python
# ✅ Send status updates at key points
if writer:
    writer({
        "status": "mission_specialist_starting",
        "payload": serialize_state(state)
    })
```

#### 2. Structured Agent Responses
```python
# ✅ Use AgentResponse for structured responses
if writer:
    agent_response = AgentResponse(
        token=response_message.content[0:100],
        response_text=parsed_response.response_content,
        status="mission_specialist_completed",
        error=None,
        debug=f"Mission proposal created: {proposed_mission.name}",
        payload={"mission": serialize_mission(proposed_mission)}
    )
    writer(agent_response.model_dump())
```

#### 3. Error Handling
```python
# ✅ Proper error communication
try:
    # Node processing logic
    ...
except Exception as e:
    if writer:
        writer({
            "status": "error",
            "error": str(e),
            "state": serialize_state(state),
            "debug": traceback.format_exc()
        })
    raise
```

### Response Schema Design

#### AgentResponse Structure
```python
class AgentResponse(BaseModel):
    """Standardized response from agent nodes"""
    token: str = Field(description="Preview token for UI")
    response_text: str = Field(description="Full response text")
    status: str = Field(description="Current processing status")
    error: Optional[str] = Field(description="Error message if any")
    debug: Optional[str] = Field(description="Debug information")
    payload: Dict[str, Any] = Field(description="Structured data payload")
```

#### Status Conventions
- `{node_name}_starting`: Node began processing
- `{node_name}_completed`: Node finished successfully
- `{node_name}_waiting`: Node waiting for user input
- `error`: Node encountered an error
- `routing`: Supervisor routing between nodes

## AI Model Integration

### Prompt Caller Pattern

All AI interactions use the `BasePromptCaller` pattern for consistency:

```python
class MissionDefinitionPromptCaller(BasePromptCaller):
    """A simplified prompt caller for mission definition"""
    
    def __init__(self):
        system_message = """You are an AI assistant that helps..."""
        super().__init__(
            response_model=MissionDefinitionResponse,
            system_message=system_message
        )
    
    async def invoke(
        self,
        messages: List[ChatMessage],
        mission: Mission,
        **kwargs: Dict[str, Any]
    ) -> MissionDefinitionResponse:
        # Call base invoke with context variables
        response = await super().invoke(
            messages=messages,
            tool_descriptions=tool_descriptions,
            mission_goal=mission_goal,
            **kwargs
        )
        return response
```

### ✅ CORRECT: AI Integration Patterns

#### 1. Structured Response Models
```python
class MissionDefinitionResponse(BaseModel):
    """Structure for mission definition response"""
    response_type: str = Field(description="Type of response")
    response_content: str = Field(description="Main response text")
    mission_proposal: Optional[MissionLite] = Field(description="Proposed mission")
```

#### 2. Context Variable Formatting
```python
# ✅ Format context variables for AI prompt
tool_descriptions = format_tool_descriptions_for_mission_design()
mission_goal = mission.goal if mission and mission.goal else "No goal specified"

# Pass to AI with proper formatting
response = await super().invoke(
    messages=messages,
    tool_descriptions=tool_descriptions,
    mission_goal=mission_goal,
    **kwargs
)
```

#### 3. Response Validation
```python
# ✅ Validate AI responses
if parsed_response.response_type == "MISSION_DEFINITION":
    if not parsed_response.mission_proposal:
        raise ValueError("Response type is MISSION_DEFINITION but no mission proposal provided")
```

### ❌ INCORRECT: AI Integration Anti-Patterns

#### 1. Unstructured Responses
```python
# DON'T DO THIS - No structure
response = await openai_client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Create a mission"}]
)
# Raw string response with no validation
```

#### 2. Missing Context
```python
# DON'T DO THIS - Missing context variables
response = await prompt_caller.invoke(
    messages=messages
    # Missing tool_descriptions, mission_goal, etc.
)
```

## Type Safety Integration

### Pydantic Model Hierarchy

```python
# ✅ Proper type hierarchy
class State(BaseModel):
    """Top-level state with all required fields"""
    messages: List[ChatMessage]
    mission: Optional[Mission] = None
    # ... other fields

class Mission(BaseModel):
    """Mission with proper asset typing"""
    mission_state: Dict[str, Asset]
    current_hop: Optional[Hop] = None
    # ... other fields

class Asset(BaseModel):
    """Asset with value representation"""
    schema_definition: SchemaType
    value_representation: str
    # ... other fields
```

### Serialization Strategy

#### ✅ CORRECT: State Serialization
```python
def serialize_state(state: State) -> dict:
    """Serialize the complete state object"""
    if not state:
        return {}
    
    state_dict = state.model_dump(mode='json')
    
    # Special handling for complex objects
    if hasattr(state, 'mission'):
        state_dict['mission'] = serialize_mission(state.mission)
    
    return state_dict
```

#### ✅ CORRECT: Mission Serialization
```python
def serialize_mission(mission: Mission) -> dict:
    """Serialize a mission to JSON-compatible dict"""
    if not mission:
        return {}
    
    mission_dict = mission.model_dump(mode='json')
    
    # Serialize mission state assets
    mission_dict['mission_state'] = serialize_assets(mission.mission_state)
    
    # Ensure status is serialized as string value
    mission_dict['status'] = mission.status.value if mission.status else None
    
    return mission_dict
```

### Database Integration

#### Service Layer Pattern
```python
class MissionService:
    """Service layer for mission persistence"""
    
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService()
        self.hop_service = HopService(db)
    
    async def update_mission(self, mission_id: str, user_id: int, mission: Mission) -> bool:
        """Update an existing mission"""
        # Map schema to database model
        mission_model = self.db.query(MissionModel).filter(
            MissionModel.id == mission_id,
            MissionModel.user_id == user_id
        ).first()
        
        if not mission_model:
            return False
        
        # Update with type safety
        mission_model.status = self._map_schema_status_to_model(mission.status)
        mission_model.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True
```

#### ✅ CORRECT: Database Persistence in Nodes
```python
async def persist_mission_if_needed(state: State, config: Dict[str, Any]) -> None:
    """Persist mission changes to database if mission_id is provided"""
    if not state.mission_id or not state.mission:
        return
    
    try:
        # Get database session from config
        db = config.get('db')
        user_id = config.get('user_id')
        
        if not db or not user_id:
            print("Warning: Cannot persist mission - missing db or user_id")
            return
        
        mission_service = MissionService(db)
        await mission_service.update_mission(state.mission_id, user_id, state.mission)
        
    except Exception as e:
        print(f"Failed to persist mission {state.mission_id}: {e}")
        # Continue without failing the workflow
```

## Node Implementation Patterns

### Standard Node Structure

```python
async def {node_name}_node(
    state: State, 
    writer: StreamWriter, 
    config: Dict[str, Any]
) -> AsyncIterator[Dict[str, Any]]:
    """Standard node implementation pattern"""
    print(f"{node_name} node")
    
    # 1. Send start status
    if writer:
        writer({
            "status": f"{node_name}_starting",
            "payload": serialize_state(state)
        })
    
    try:
        # 2. Validate input state
        if not state.mission:
            raise ValueError("Mission is required for this node")
        
        # 3. Process with AI or business logic
        prompt_caller = SomePromptCaller()
        parsed_response = await prompt_caller.invoke(
            messages=state.messages,
            mission=state.mission
        )
        
        # 4. Create response message
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",
            role=MessageRole.ASSISTANT,
            content=parsed_response.response_content,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # 5. Update state immutably
        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": updated_mission,
            "mission_id": state.mission_id,
            "next_node": "supervisor_node",
            "tool_params": state.tool_params,
            "asset_summaries": state.asset_summaries
        }
        
        # 6. Persist changes if needed
        await persist_mission_if_needed(state, config)
        
        # 7. Send completion response
        if writer:
            agent_response = AgentResponse(
                token=response_message.content[0:100],
                response_text=response_message.content,
                status=f"{node_name}_completed",
                debug=f"Processed {node_name} successfully",
                payload={"mission": serialize_mission(updated_mission)}
            )
            writer(agent_response.model_dump())
        
        # 8. Return routing command
        return Command(goto=next_node, update=state_update)
        
    except Exception as e:
        # 9. Handle errors
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in {node_name} node:", error_traceback)
        
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state),
                "debug": error_traceback
            })
        raise
```

### Supervisor Node Pattern

```python
async def supervisor_node(
    state: State, 
    writer: StreamWriter, 
    config: Dict[str, Any]
) -> AsyncIterator[Dict[str, Any]]:
    """Supervisor node that routes to appropriate specialist"""
    
    if writer:
        writer({
            "status": "supervisor_routing",
            "payload": serialize_state(state)
        })
    
    try:
        # Determine next node based on state
        next_node = None
        routing_message = ""
        
        if not state.mission:
            next_node = "mission_specialist_node"
            routing_message = "No mission found - routing to mission specialist"
        elif state.mission.status == MissionStatus.PROPOSED:
            next_node = "mission_specialist_node"
            routing_message = "Mission pending - routing to mission specialist"
        elif state.mission.status == MissionStatus.READY_FOR_NEXT_HOP:
            next_node = "hop_designer_node"
            routing_message = "Ready to design next hop"
        # ... more routing logic
        
        # Create routing response
        response_message = ChatMessage(
            id=str(uuid.uuid4()),
            chat_id="temp",
            role=MessageRole.ASSISTANT,
            content=routing_message,
            message_metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        state_update = {
            "messages": [*state.messages, response_message.model_dump()],
            "mission": state.mission,
            "mission_id": state.mission_id,
            "next_node": next_node,
            "tool_params": state.tool_params,
            "asset_summaries": state.asset_summaries
        }
        
        # Send routing response
        if writer:
            agent_response = AgentResponse(
                token=routing_message,
                response_text=routing_message,
                status="supervisor_routing_completed",
                debug=f"Routing to: {next_node}",
                payload=serialize_state(State(**state_update))
            )
            writer(agent_response.model_dump())
        
        return Command(goto=next_node, update=state_update)
        
    except Exception as e:
        if writer:
            writer({
                "status": "error",
                "error": str(e),
                "state": serialize_state(state)
            })
        raise
```

## Error Handling and Debugging

### Error Patterns

#### ✅ CORRECT: Comprehensive Error Handling
```python
try:
    # Node processing logic
    result = await process_something()
    
except ValidationError as e:
    # Handle validation errors specifically
    if writer:
        writer({
            "status": "validation_error",
            "error": f"Validation failed: {str(e)}",
            "debug": str(e.errors())
        })
    raise
    
except Exception as e:
    # Handle all other errors
    import traceback
    error_traceback = traceback.format_exc()
    print(f"Error in {node_name} node:", error_traceback)
    
    if writer:
        writer({
            "status": "error",
            "error": str(e),
            "state": serialize_state(state),
            "debug": error_traceback
        })
    raise
```

#### ✅ CORRECT: Debug Information
```python
# ✅ Provide useful debug information
agent_response = AgentResponse(
    token=response_text[0:100],
    response_text=response_text,
    status="node_completed",
    debug=f"Mission: {state.mission.status}, Hop: {current_hop.status}, Processing: {action}",
    payload={"mission": serialize_mission(state.mission)}
)
```

### Logging and Monitoring

#### ✅ CORRECT: Structured Logging
```python
# ✅ Log important state transitions
print(f"DEBUG: Mission status: {state.mission.status if state.mission else 'No mission'}")
print(f"DEBUG: Current hop status: {state.mission.current_hop.status if state.mission and state.mission.current_hop else 'No current hop'}")
print(f"DEBUG: Next node: {next_node}")
```

#### ✅ CORRECT: Prompt Logging
```python
# ✅ Log AI prompts for debugging
if log_prompt:
    try:
        log_file_path = log_prompt_messages(
            messages=formatted_messages,
            prompt_type=self.__class__.__name__.lower()
        )
        print(f"Prompt messages logged to: {log_file_path}")
    except Exception as log_error:
        print(f"Warning: Failed to log prompt: {log_error}")
```

## Performance and Scalability

### Efficient State Management

#### ✅ CORRECT: Asset Loading Strategy
```python
# ✅ Load assets efficiently based on need
def _model_to_mission(self, mission_model: MissionModel) -> Mission:
    """Convert database model to Mission schema object"""
    # Load assets from database
    assets = self.asset_service.get_assets_by_scope(
        user_id=mission_model.user_id,
        scope_type="mission",
        scope_id=mission_model.id
    )
    
    # Create mission_state dict
    mission_state = {asset.name: asset for asset in assets}
    
    return Mission(
        # ... mission fields
        mission_state=mission_state
    )
```

#### ✅ CORRECT: Streaming Updates
```python
# ✅ Stream updates for long-running operations
async def long_running_node(state: State, writer: StreamWriter, config: Dict[str, Any]):
    total_steps = 5
    
    for i in range(total_steps):
        # Do processing step
        await process_step(i)
        
        # Send progress update
        if writer:
            writer({
                "status": "processing",
                "progress": (i + 1) / total_steps,
                "message": f"Completed step {i + 1} of {total_steps}"
            })
```

### Memory Management

#### ✅ CORRECT: Resource Cleanup
```python
# ✅ Proper resource cleanup
class SomeService:
    def __init__(self):
        self.db = None
        self.client = None
    
    def close(self):
        """Clean up resources"""
        if self.db:
            self.db.close()
        if self.client:
            self.client.close()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.close()
```

## Testing Strategies

### Unit Testing Node Logic

```python
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
async def test_mission_specialist_node():
    """Test mission specialist node behavior"""
    # Arrange
    state = State(
        messages=[],
        mission=None,
        mission_id=None,
        tool_params={},
        next_node="supervisor_node",
        asset_summaries={}
    )
    
    writer = Mock()
    config = {"db": Mock(), "user_id": 123}
    
    # Act
    result = await mission_specialist_node(state, writer, config)
    
    # Assert
    assert result.goto == "supervisor_node"
    assert writer.called
    assert "mission_specialist_starting" in str(writer.call_args_list[0])
```

### Integration Testing

```python
@pytest.mark.asyncio
async def test_full_mission_flow():
    """Test complete mission creation flow"""
    # Test the full graph execution
    state = State(
        messages=[ChatMessage(content="Create a mission to analyze data")],
        mission=None,
        mission_id=None,
        tool_params={},
        next_node="supervisor_node",
        asset_summaries={}
    )
    
    config = {"db": test_db, "user_id": 123}
    
    # Execute graph
    results = []
    async for output in graph.astream(state, config=config):
        results.append(output)
    
    # Verify results
    assert len(results) > 0
    assert any("mission_specialist_completed" in str(r) for r in results)
```

## Common Anti-Patterns to Avoid

### ❌ State Management Anti-Patterns

1. **Direct State Mutation**
```python
# DON'T DO THIS
state.mission.status = MissionStatus.COMPLETED  # Mutates original
```

2. **Incomplete State Updates**
```python
# DON'T DO THIS
return Command(goto=next_node, update={"mission": new_mission})  # Missing other fields
```

3. **Missing Error Handling**
```python
# DON'T DO THIS
async def bad_node(state, writer, config):
    result = await risky_operation()  # No try/catch
    return Command(goto="next_node", update=state_update)
```

### ❌ Communication Anti-Patterns

1. **Missing Status Updates**
```python
# DON'T DO THIS
async def bad_node(state, writer, config):
    # Long processing without status updates
    result = await long_operation()
    return result
```

2. **Unstructured Responses**
```python
# DON'T DO THIS
if writer:
    writer("Some string message")  # No structure
```

3. **Missing Error Communication**
```python
# DON'T DO THIS
try:
    result = await operation()
except Exception as e:
    # Silent failure - client never knows
    pass
```

## Conclusion

Proper primary agent node implementation requires:

1. **Immutable State Management**: Always create new state objects, never mutate existing ones
2. **Structured Communication**: Use AgentResponse and standardized status messages
3. **Type Safety**: Leverage Pydantic models throughout the system
4. **Error Handling**: Comprehensive error handling with client notification
5. **Performance**: Efficient asset loading and streaming updates
6. **Persistence**: Proper database integration with service layer
7. **Testing**: Comprehensive unit and integration tests

Following these patterns ensures:
- **Reliability**: Robust error handling and state management
- **Maintainability**: Clear patterns and type safety
- **Performance**: Efficient resource usage and streaming
- **Debuggability**: Comprehensive logging and monitoring
- **Scalability**: Proper resource cleanup and state management

Remember: **Primary agent nodes are the core of the system's intelligence - they must be implemented with careful attention to state management, type safety, and client communication patterns.** 