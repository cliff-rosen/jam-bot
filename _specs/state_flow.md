# State Flow Specification

## Basic Flow

1. **Initial State**
   - A mission object always exists in state, starting with status "pending"
   - No workflow exists yet

2. **When User Makes a Request**
   - If mission is "pending":
     - Route to mission specialist to define the mission
     - When mission is defined, status becomes "ready"
   - If mission is "ready" but no workflow exists:
     - Route to workflow specialist to create workflow
   - If workflow exists:
     - Execute the workflow
   - If workflow completes:
     - Set mission status to "complete"

## Status Types

```typescript
// Mission can be in one of three states
type MissionStatus = "pending" | "ready" | "complete";

// Workflow can be in one of four states
type WorkflowStatus = "pending" | "designed" | "executing" | "complete";
```

## Simple Rules

1. **Mission Rules**
   - Start as "pending"
   - Become "ready" when mission is defined
   - Become "complete" when workflow finishes
   - Never go backward in status

2. **Workflow Rules**
   - Start as "pending"
   - Become "designed" when created
   - Become "executing" when started
   - Become "complete" when finished
   - Never go backward in status

3. **Supervisor Rules**
   - If mission is "pending":
     - Route to mission specialist
   - If mission is "ready" and no workflow exists:
     - Route to workflow specialist
   - If mission is "ready" and workflow exists:
     - Execute workflow
   - If mission is "complete":
     - Give final answer

## Example Flow

1. User: "Help me analyze my emails"
2. Supervisor sees mission is "pending"
3. Routes to mission specialist
4. Mission specialist defines mission (status becomes "ready")
5. Supervisor sees mission is "ready" with no workflow
6. Routes to workflow specialist
7. Workflow specialist creates workflow
8. Supervisor executes workflow
9. When workflow completes, mission becomes "complete"
10. Supervisor gives final answer 