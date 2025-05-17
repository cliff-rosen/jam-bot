# Workflow Transition Data Specification

## Overview
The `workflowTransitionData.ts` file contains a series of UI snapshots that represent the state of the workflow at different points in time. These snapshots are used to demonstrate and test the workflow progression in the interactive workflow demo.

## Structure

### UISnapshot Interface
```typescript
interface UISnapshot {
    timestamp: string;          // ISO timestamp of the snapshot
    description: string;        // Human-readable description of the state
    journey: Journey;          // The complete journey state at this point
}
```

### Journey Structure
Each snapshot must contain a complete `Journey` object with:
- Basic metadata (id, title, goal, state, etc.)
- Messages array (chat history)
- Workflow state
- Workspace state
- Assets
- Agents

## Rules and Guidelines

### 1. State Progression
- Each snapshot must represent a logical progression from the previous state
- State transitions should be clear and meaningful
- All required fields must be present and properly typed
- Maintain consistency in IDs and references across snapshots

### 2. Message History
- Messages should accumulate across snapshots
- Each new message should have a unique ID
- Message timestamps should be consistent with the snapshot timestamp
- Action buttons in messages should match the available actions in that state

### 3. Workflow State
- Workflow steps should progress logically (pending → running → completed)
- Only one step should be running at a time
- Completed steps should have their outputs properly set
- CurrentStepIndex should accurately reflect the active step

### 4. Workspace State
- Workspace objectType should match the current focus
- Object content should be complete and properly typed
- Action buttons should be appropriate for the current state

### 5. Assets
- Assets should be properly referenced in workflow steps
- Asset metadata should be complete and consistent
- Asset IDs should be unique and follow the naming convention
- Asset types and formats should be valid

### 6. Agents
- Agent status should reflect their current activity
- Agent inputs/outputs should match the current step
- Agent capabilities should be appropriate for their role
- Only one agent should be active at a time

## Naming Conventions

### IDs
- Journey IDs: `j_YYYY_MM_DD_XXX`
- Workflow IDs: `w_YYYY_MM_DD_XXX`
- Step IDs: `s_YYYY_MM_DD_XXX`
- Asset IDs: `a_YYYY_MM_DD_XXX` or `ds_YYYY_MM_DD_XXX` for datasets
- Message IDs: `m_YYYY_MM_DD_XXX`
- Agent IDs: `agent_XXX`

### Timestamps
- Use ISO format: `YYYY-MM-DDTHH:MM:SSZ`
- Maintain consistent time progression across snapshots

## State Transitions

### Journey States
1. `AWAITING_GOAL` - Initial state, waiting for goal definition
2. `AWAITING_WORKFLOW_DESIGN` - Goal defined, waiting for workflow design
3. `AWAITING_WORKFLOW_START` - Workflow designed, ready to start
4. `WORKFLOW_IN_PROGRESS` - Workflow is running
5. `WORKFLOW_COMPLETED` - All steps completed

### Step States
1. `pending` - Step is waiting to start
2. `running` - Step is currently executing
3. `completed` - Step has finished successfully

### Agent States
1. `active` - Agent is currently working
2. `inactive` - Agent is not currently working

## Validation Rules

### Required Fields
- All snapshots must have:
  - timestamp
  - description
  - journey (with all required fields)
  - messages array
  - workflow state
  - workspace state
  - assets array
  - agents array

### Type Safety
- All objects must match their TypeScript interfaces
- No undefined or null values for required fields
- Proper typing for all arrays and objects

## Example Structure

```typescript
{
    timestamp: "2024-03-15T10:00:00Z",
    description: "Theme Analysis step begins",
    journey: {
        id: "j_2024_03_15_001",
        title: "Q1 Client Feedback Analysis",
        goal: "Analyze client feedback...",
        state: "WORKFLOW_IN_PROGRESS",
        // ... other journey fields
        messages: [
            // ... accumulated messages
        ],
        workflow: {
            // ... workflow state
        },
        workspace: {
            // ... workspace state
        },
        assets: [
            // ... assets
        ],
        agents: [
            // ... agents
        ]
    }
}
```

## Best Practices

1. **Incremental Changes**
   - Each snapshot should only change what's necessary
   - Maintain consistency in unchanged fields
   - Copy and modify previous snapshot for new states

2. **Message Flow**
   - Keep messages natural and conversational
   - Include appropriate action buttons
   - Maintain context across messages

3. **Asset Management**
   - Track asset creation and usage
   - Update asset references when needed
   - Maintain asset history

4. **Agent Coordination**
   - Only one agent active at a time
   - Clear handoffs between agents
   - Proper input/output connections

5. **Error Prevention**
   - Validate all references exist
   - Check for missing required fields
   - Ensure type safety
   - Test transitions in the UI

## Testing Guidelines

1. **State Transitions**
   - Test each transition in the UI
   - Verify all components update correctly
   - Check for any missing or incorrect data

2. **Type Checking**
   - Run TypeScript compiler
   - Fix all type errors
   - Ensure interface compliance

3. **UI Consistency**
   - Verify all UI elements render correctly
   - Check action button functionality
   - Validate asset displays

4. **Message Flow**
   - Test message accumulation
   - Verify action button responses
   - Check message formatting

## Maintenance

1. **Adding New States**
   - Follow the naming conventions
   - Maintain type safety
   - Update documentation if needed

2. **Modifying Existing States**
   - Update all affected references
   - Maintain backward compatibility
   - Document changes

3. **Debugging**
   - Use TypeScript for error detection
   - Test transitions in isolation
   - Verify data consistency 