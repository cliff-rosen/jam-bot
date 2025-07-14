# Mission and Hop State System Walkthrough

This document provides a complete walkthrough of the mission and hop state system, demonstrating the happy path from mission creation to completion with two hops.

## Overview

The state system operates on two levels:
- **Mission Level**: Simple states reflecting overall mission lifecycle
- **Hop Level**: Detailed workflow states for when mission is in progress

## Complete Happy Path: Mission with 2 Hops

### Phase 1: Mission Creation and Approval

#### Step 1.1: Agent Proposes Mission
```
Action: Agent analyzes user requirements and proposes mission
Result: Mission created with status AWAITING_APPROVAL
State: Mission.status = AWAITING_APPROVAL, current_hop_id = null
```

**Mission State:**
- Status: `AWAITING_APPROVAL`
- Current Hop: None
- Description: "Create a weekly newsletter automation system"
- Input Assets: Email credentials, content sources
- Output Assets: Automated newsletter system

#### Step 1.2: User Approves Mission
```
Action: User reviews and approves the mission proposal
Result: Mission status changes to IN_PROGRESS
State: Mission.status = IN_PROGRESS, current_hop_id = null
```

**Mission State:**
- Status: `IN_PROGRESS`
- Current Hop: None (ready for first hop)

---

### Phase 2: First Hop Lifecycle

#### Step 2.1: Agent Starts Planning First Hop
```
Action: Agent begins planning the first hop implementation
Result: New hop created and linked to mission
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_STARTED
```

**Mission State:**
- Status: `IN_PROGRESS`
- Current Hop: Hop #1

**Hop #1 State:**
- Status: `HOP_PLAN_STARTED`
- Name: "Set up email content aggregation"
- Sequence: 1
- Description: "Configure email credentials and set up content source connections"

#### Step 2.2: Agent Completes Hop Plan
```
Action: Agent finalizes the hop plan with tool steps
Result: Hop plan ready for user review
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_PROPOSED
```

**Hop #1 State:**
- Status: `HOP_PLAN_PROPOSED`
- Plan: 
  - Tool Step 1: Configure Gmail API connection
  - Tool Step 2: Set up RSS feed readers
  - Tool Step 3: Create content aggregation pipeline

#### Step 2.3: User Approves Hop Plan
```
Action: User reviews and approves the hop plan
Result: Hop plan approved and ready for implementation
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_READY
```

**Hop #1 State:**
- Status: `HOP_PLAN_READY`

#### Step 2.4: Agent Starts Implementation
```
Action: Agent begins implementing the approved hop plan
Result: Implementation phase begins
State: Mission.status = IN_PROGRESS, Hop.status = HOP_IMPL_STARTED
```

**Hop #1 State:**
- Status: `HOP_IMPL_STARTED`
- Agent creating detailed tool step configurations and parameter mappings

#### Step 2.5: Agent Proposes Implementation
```
Action: Agent completes implementation and proposes tool step sequence
Result: Implementation ready for user review
State: Mission.status = IN_PROGRESS, Hop.status = HOP_IMPL_PROPOSED
```

**Hop #1 State:**
- Status: `HOP_IMPL_PROPOSED`
- Tool Steps:
  - Step 1: Gmail API setup (configured)
  - Step 2: RSS feed configuration (configured)
  - Step 3: Content pipeline creation (configured)

#### Step 2.6: User Approves Implementation
```
Action: User reviews and approves the implementation
Result: Implementation approved and ready for execution
State: Mission.status = IN_PROGRESS, Hop.status = HOP_IMPL_READY
```

**Hop #1 State:**
- Status: `HOP_IMPL_READY`

#### Step 2.7: User Triggers Execution
```
Action: User initiates hop execution
Result: Hop begins executing tool steps
State: Mission.status = IN_PROGRESS, Hop.status = EXECUTING
```

**Hop #1 State:**
- Status: `EXECUTING`
- Tool steps running sequentially
- Asset creation and updates in progress

#### Step 2.8: Hop Execution Completes
```
Action: All tool steps complete successfully
Result: Hop finished, mission continues
State: Mission.status = IN_PROGRESS, Hop.status = COMPLETED, current_hop_id = null
```

**Mission State:**
- Status: `IN_PROGRESS`
- Current Hop: None (ready for next hop)
- Hop History: [Hop #1 - COMPLETED]

**Hop #1 State:**
- Status: `COMPLETED`
- Output Assets: Email connections established, content sources configured

---

### Phase 3: Second Hop Lifecycle

#### Step 3.1: Agent Starts Planning Second Hop
```
Action: Agent begins planning the second hop
Result: New hop created for newsletter generation
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_STARTED
```

**Mission State:**
- Status: `IN_PROGRESS`
- Current Hop: Hop #2

**Hop #2 State:**
- Status: `HOP_PLAN_STARTED`
- Name: "Build newsletter generation and automation"
- Sequence: 2
- Description: "Create newsletter template and set up automated sending schedule"

#### Step 3.2: Agent Completes Second Hop Plan
```
Action: Agent finalizes the second hop plan
Result: Hop plan ready for user review
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_PROPOSED
```

**Hop #2 State:**
- Status: `HOP_PLAN_PROPOSED`
- Plan:
  - Tool Step 1: Create newsletter template
  - Tool Step 2: Set up content generation pipeline
  - Tool Step 3: Configure automated sending schedule

#### Step 3.3: User Approves Second Hop Plan
```
Action: User reviews and approves the hop plan
Result: Hop plan approved
State: Mission.status = IN_PROGRESS, Hop.status = HOP_PLAN_READY
```

**Hop #2 State:**
- Status: `HOP_PLAN_READY`

#### Step 3.4: Agent Implements Second Hop
```
Action: Agent starts and completes implementation
Result: Implementation ready for user review
State: Mission.status = IN_PROGRESS, Hop.status = HOP_IMPL_STARTED → HOP_IMPL_PROPOSED
```

**Hop #2 State:**
- Status: `HOP_IMPL_PROPOSED`
- Tool Steps configured for newsletter generation and automation

#### Step 3.5: User Approves Final Implementation
```
Action: User approves the final implementation
Result: Ready for final execution
State: Mission.status = IN_PROGRESS, Hop.status = HOP_IMPL_READY
```

**Hop #2 State:**
- Status: `HOP_IMPL_READY`
- is_final: true (marked as final hop)

#### Step 3.6: Final Hop Execution
```
Action: User triggers final hop execution
Result: Final hop executes successfully
State: Mission.status = IN_PROGRESS, Hop.status = EXECUTING
```

**Hop #2 State:**
- Status: `EXECUTING`
- Creating newsletter template, setting up automation

#### Step 3.7: Mission Completion
```
Action: Final hop completes successfully
Result: Mission completes as final hop is done
State: Mission.status = COMPLETED, Hop.status = COMPLETED
```

**Final Mission State:**
- Status: `COMPLETED`
- Current Hop: Hop #2 (COMPLETED)
- Hop History: [Hop #1 - COMPLETED, Hop #2 - COMPLETED]
- Output Assets: Complete newsletter automation system

**Final Hop #2 State:**
- Status: `COMPLETED`
- is_final: true
- Output Assets: Newsletter system fully operational

---

## State Transition Summary

### Mission Status Flow
```
[Creation] → AWAITING_APPROVAL → IN_PROGRESS → COMPLETED
```

### Hop Status Flow (per hop)
```
HOP_PLAN_STARTED → HOP_PLAN_PROPOSED → HOP_PLAN_READY → 
HOP_IMPL_STARTED → HOP_IMPL_PROPOSED → HOP_IMPL_READY → 
EXECUTING → COMPLETED
```

### Key Coordination Points

1. **Mission-Hop Coordination**: Mission stays `IN_PROGRESS` while hops cycle through their states
2. **Hop Completion**: When hop completes, mission's `current_hop_id` resets to null for next hop
3. **Mission Completion**: Mission completes when final hop (is_final=true) reaches `COMPLETED`
4. **User Approval Gates**: User approval required at `HOP_PLAN_PROPOSED` and `HOP_IMPL_PROPOSED`
5. **Execution Trigger**: User must explicitly trigger execution at `HOP_IMPL_READY`

## Asset Flow Throughout States

### Mission Level Assets
- **Input Assets**: Available from mission approval
- **Output Assets**: Updated as hops complete
- **Intermediate Assets**: Created by hops, promoted to mission level

### Hop Level Assets
- **Input Assets**: Copied from mission state at hop start
- **Output Assets**: Created during hop execution
- **Intermediate Assets**: Used within hop, may be promoted to mission

## Error Handling Paths

While this document focuses on the happy path, the system also supports:
- **Rejection Paths**: User can reject plans/implementations
- **Failure States**: Both mission and hop `FAILED` states
- **Cancellation**: User can cancel at any point (`CANCELLED` state)
- **Retry Mechanisms**: Failed hops can be retried or replaced

## Implementation Notes

1. **State Validation**: System should validate state transitions
2. **Atomicity**: State changes should be atomic transactions
3. **Event Logging**: All state transitions should be logged for audit
4. **Recovery**: System should handle partial state corruption
5. **Notifications**: Users should be notified of state changes requiring action

This walkthrough demonstrates how the simplified mission states coordinate with detailed hop workflow states to provide a clear, manageable progression from mission proposal to completion.