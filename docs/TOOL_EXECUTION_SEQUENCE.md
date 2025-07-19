# Tool Execution Sequence Specification

## Overview
This document describes the complete sequence of operations for tool execution in the Jam Bot system, from frontend user interaction to backend state management.

## Sequence of Operations

### 1. Frontend Initiation (JamBotContext)
**Location**: `frontend/src/context/JamBotContext.tsx:executeToolStep()`

1. **User Interaction**: User clicks "Execute" button in HopDetails component
2. **Status Update**: JamBotContext dispatches `EXECUTE_TOOL_STEP` action to update tool step status to `EXECUTING`
3. **API Call**: Calls `toolsApi.executeTool(toolStepId)` with only the tool step ID

### 2. Frontend API Layer
**Location**: `frontend/src/lib/api/toolsApi.ts:executeTool()`

1. **HTTP Request**: Makes POST request to `/api/tools/step/{toolStepId}/execute`
2. **Minimal Payload**: Sends only the tool step ID, no additional context

### 3. Backend Router
**Location**: `backend/routers/tools.py:execute_tool_step()`

1. **Authentication**: Validates user token via dependency injection
2. **Database Session**: Gets database session via dependency injection
3. **Service Delegation**: Calls `ToolExecutionService.execute_tool_step(toolStepId, userId)`

### 4. Tool Execution Service
**Location**: `backend/services/tool_execution_service.py:execute_tool_step()`

#### 4.1 Tool Step Retrieval
1. **Get Tool Step**: Uses `ToolStepService.get_tool_step(toolStepId, userId)`
2. **Validation**: Checks if tool step exists and belongs to user

#### 4.2 Status Management
1. **Mark Executing**: Uses `ToolStepService.update_tool_step_status()` to set status to `EXECUTING`

#### 4.3 Asset Context Resolution
1. **Get Assets**: Uses `AssetService.get_assets_by_scope("hop", hopId, userId)`
2. **Build Context**: Creates asset context dictionary mapping asset IDs to Asset objects

#### 4.4 Tool Execution
1. **Core Execution**: Calls `execute_tool_step_core()` from `tools/tool_execution.py`
2. **Parameter Mapping**: Maps asset values to tool input parameters based on step configuration
3. **Tool Registry**: Gets tool definition from tool registry
4. **Stubbing Check**: Determines if tool should be stubbed for testing
5. **Handler Execution**: Calls actual tool handler or stub
6. **Result Processing**: Processes tool outputs with canonical type handling

#### 4.5 State Transition
1. **State Update**: Uses `StateTransitionService.updateState()` with `COMPLETE_TOOL_STEP` transaction type
2. **Asset Updates**: StateTransitionService handles asset creation/updates based on result mappings
3. **Hop Completion**: Checks if hop is complete and updates status accordingly
4. **Mission Completion**: Checks if mission is complete and updates status accordingly

#### 4.6 Error Handling
1. **Failure Status**: On error, uses `ToolStepService.update_tool_step_status()` to mark as `FAILED`
2. **Error Message**: Stores error message in tool step

### 5. Backend Response
1. **Comprehensive Result**: Returns execution results including:
   - Success status
   - Tool execution results
   - State transition metadata
   - Assets created
   - Hop/mission completion status

### 6. Frontend Result Processing
**Location**: `frontend/src/context/JamBotContext.tsx:executeToolStep()`

#### 6.1 Success Path
1. **Chat Message**: Adds success message to chat
2. **Asset Updates**: Updates hop assets based on tool outputs
3. **Status Updates**: Updates tool step status to `COMPLETED`
4. **Hop State**: Updates hop state with new asset values
5. **Mission Updates**: Updates mission assets if hop outputs map to mission inputs
6. **Auto-completion**: Marks hop as complete if all outputs are ready

#### 6.2 Failure Path
1. **Error Handling**: Updates tool step status to `FAILED`
2. **Error Display**: Shows error message to user
3. **State Consistency**: Maintains consistent state despite failure

## Service Responsibilities

### ToolExecutionService
- Orchestrates the execution flow
- Coordinates between other services
- Manages execution lifecycle

### ToolStepService
- All tool step database operations
- Status management
- Tool step retrieval and updates

### AssetService
- Asset retrieval by scope
- Asset creation and updates
- Asset lifecycle management

### StateTransitionService
- Workflow state management
- Asset result mapping processing
- Hop and mission completion logic
- Cross-cutting state updates

### Core Tool Execution
- Parameter mapping from assets
- Tool registry integration
- Actual tool handler execution
- Result processing with canonical types

## Key Design Principles

1. **Single Responsibility**: Each service has clear, focused responsibilities
2. **Minimal Interface**: Frontend only sends tool step ID
3. **Service Boundaries**: No direct database access across service boundaries
4. **Error Isolation**: Errors don't cascade across service boundaries
5. **State Consistency**: StateTransitionService ensures atomic state updates
6. **Extensibility**: Tool execution logic is separated from orchestration