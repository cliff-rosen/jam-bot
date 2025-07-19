# Tool Execution Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant HopDetails as HopDetails.tsx
    participant JamBotCtx as JamBotContext.tsx
    participant ToolsAPI as toolsApi.ts
    participant Router as tools.py
    participant ToolExecSvc as ToolExecutionService
    participant ToolStepSvc as ToolStepService
    participant AssetSvc as AssetService
    participant CoreExec as tool_execution.py
    participant StateTransSvc as StateTransitionService
    participant ToolRegistry as Tool Registry
    participant ToolHandler as Tool Handler

    User->>HopDetails: Click "Execute" button
    HopDetails->>JamBotCtx: executeToolStep(step, hop)
    
    Note over JamBotCtx: 1. Update UI State
    JamBotCtx->>JamBotCtx: dispatch(EXECUTE_TOOL_STEP)
    JamBotCtx->>JamBotCtx: Set step status to EXECUTING
    
    Note over JamBotCtx,ToolsAPI: 2. Frontend API Call
    JamBotCtx->>ToolsAPI: executeTool(step.id)
    ToolsAPI->>Router: POST /api/tools/step/{stepId}/execute
    
    Note over Router,ToolExecSvc: 3. Backend Orchestration
    Router->>ToolExecSvc: execute_tool_step(stepId, userId)
    
    Note over ToolExecSvc,ToolStepSvc: 4. Tool Step Management
    ToolExecSvc->>ToolStepSvc: get_tool_step(stepId, userId)
    ToolStepSvc-->>ToolExecSvc: ToolStep schema
    ToolExecSvc->>ToolStepSvc: update_tool_step_status(EXECUTING)
    ToolStepSvc-->>ToolExecSvc: Success
    
    Note over ToolExecSvc,AssetSvc: 5. Asset Context Resolution
    ToolExecSvc->>AssetSvc: get_assets_by_scope("hop", hopId, userId)
    AssetSvc-->>ToolExecSvc: Hop assets list
    ToolExecSvc->>ToolExecSvc: Build asset context dict
    
    Note over ToolExecSvc,CoreExec: 6. Core Tool Execution
    ToolExecSvc->>CoreExec: execute_tool_step_core(step, assetContext, userId, db)
    
    Note over CoreExec,ToolRegistry: 6.1 Tool Resolution
    CoreExec->>ToolRegistry: get_tool_definition(toolId)
    ToolRegistry-->>CoreExec: Tool definition
    
    Note over CoreExec: 6.2 Parameter Mapping
    CoreExec->>CoreExec: Map asset values to tool parameters
    CoreExec->>CoreExec: Build ToolExecutionInput
    
    Note over CoreExec,ToolHandler: 6.3 Tool Handler Execution
    alt Tool should be stubbed
        CoreExec->>CoreExec: Generate stub response
    else Real execution
        CoreExec->>ToolHandler: handler(executionInput)
        ToolHandler-->>CoreExec: Tool results
    end
    
    Note over CoreExec: 6.4 Result Processing
    CoreExec->>CoreExec: Process results with canonical types
    CoreExec->>CoreExec: Handle asset persistence
    CoreExec-->>ToolExecSvc: Tool execution results
    
    Note over ToolExecSvc,StateTransSvc: 7. State Transition Management
    ToolExecSvc->>StateTransSvc: updateState(COMPLETE_TOOL_STEP, data)
    
    Note over StateTransSvc: 7.1 State Updates
    StateTransSvc->>StateTransSvc: Update tool step status to COMPLETED
    StateTransSvc->>StateTransSvc: Process result mappings
    StateTransSvc->>StateTransSvc: Create/update assets
    StateTransSvc->>StateTransSvc: Check hop completion
    StateTransSvc->>StateTransSvc: Check mission completion
    StateTransSvc-->>ToolExecSvc: Transition results
    
    Note over ToolExecSvc,Router: 8. Response Assembly
    ToolExecSvc->>ToolExecSvc: Build comprehensive response
    ToolExecSvc-->>Router: Execution results
    Router-->>ToolsAPI: HTTP 200 + results
    ToolsAPI-->>JamBotCtx: ToolExecutionResponse
    
    Note over JamBotCtx: 9. Frontend State Updates
    JamBotCtx->>JamBotCtx: Add success message to chat
    JamBotCtx->>JamBotCtx: Update hop assets with tool outputs
    JamBotCtx->>JamBotCtx: Update tool step status to COMPLETED
    JamBotCtx->>JamBotCtx: Check hop completion
    JamBotCtx->>JamBotCtx: Update mission assets if needed
    JamBotCtx->>JamBotCtx: dispatch(UPDATE_HOP_STATE)
    
    Note over HopDetails,User: 10. UI Update
    JamBotCtx-->>HopDetails: State updated
    HopDetails->>HopDetails: Re-render with new state
    HopDetails-->>User: Show execution results

    Note over ToolExecSvc,ToolStepSvc: Error Handling
    alt Execution fails
        ToolExecSvc->>ToolStepSvc: update_tool_step_status(FAILED, errorMsg)
        ToolExecSvc-->>Router: Error response
        Router-->>ToolsAPI: HTTP 500 + error
        ToolsAPI-->>JamBotCtx: Error
        JamBotCtx->>JamBotCtx: Update step status to FAILED
        JamBotCtx->>JamBotCtx: Show error to user
    end
```

## Diagram Explanation

### Key Phases:

1. **User Interaction** (1): User initiates execution through UI
2. **Frontend State Management** (2): React context updates local state
3. **API Communication** (3): HTTP request to backend
4. **Backend Orchestration** (4-7): Services coordinate execution
5. **Tool Execution** (6): Core tool logic with parameter mapping and handler execution
6. **State Management** (7): Workflow state updates and completion checks
7. **Response Processing** (8-10): Results propagated back to frontend and UI

### Service Interactions:

- **ToolExecutionService**: Central orchestrator
- **ToolStepService**: Tool step database operations
- **AssetService**: Asset retrieval and management
- **StateTransitionService**: Workflow state transitions
- **Core Execution**: Tool parameter mapping and handler execution

### Error Flow:

The diagram includes error handling showing how failures are propagated back through the service layers and ultimately displayed to the user while maintaining state consistency.

### Key Benefits:

1. **Clear Separation**: Each service has distinct responsibilities
2. **Minimal Coupling**: Services interact through well-defined interfaces
3. **Error Isolation**: Failures don't cascade inappropriately
4. **State Consistency**: StateTransitionService ensures atomic updates
5. **Extensibility**: New tools can be added without changing the orchestration flow