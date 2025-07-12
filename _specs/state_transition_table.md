# State Transition Table

This table shows every state transition in the mission and hop system. Each trigger may cause updates to multiple entities simultaneously.

| Step | Trigger | Actor | Mission State | Hop State | Entity Updates | Notes |
|------|---------|-------|---------------|-----------|----------------|-------|
| 1.1 | Agent proposes mission | Agent | *None* → AWAITING_APPROVAL | *None* | Mission created | Mission created with input/output assets |
| 1.2 | User approves mission | User | AWAITING_APPROVAL → IN_PROGRESS | *None* | Mission updated | Mission ready for hop work |
| 2.1 | User requests hop plan | User | IN_PROGRESS → IN_PROGRESS | *None* → HOP_PLAN_STARTED | Mission: current_hop_id set<br>Hop #1: created and linked | User clicks button, agent creates hop |
| 2.2 | Agent completes hop plan | Agent | IN_PROGRESS (no change) | HOP_PLAN_STARTED → HOP_PLAN_PROPOSED | Hop #1 updated | Agent finishes planning, proposes to user |
| 2.3 | User approves hop plan | User | IN_PROGRESS (no change) | HOP_PLAN_PROPOSED → HOP_PLAN_READY | Hop #1 updated | Plan approved, ready for implementation |
| 2.4 | User requests implementation | User | IN_PROGRESS (no change) | HOP_PLAN_READY → HOP_IMPL_STARTED | Hop #1 updated | User clicks button, agent starts implementing |
| 2.5 | Agent completes implementation | Agent | IN_PROGRESS (no change) | HOP_IMPL_STARTED → HOP_IMPL_PROPOSED | Hop #1 updated | Agent finishes implementation, proposes to user |
| 2.6 | User approves implementation | User | IN_PROGRESS (no change) | HOP_IMPL_PROPOSED → HOP_IMPL_READY | Hop #1 updated | Implementation approved |
| 2.7 | User triggers execution | User | IN_PROGRESS (no change) | HOP_IMPL_READY → EXECUTING | Hop #1 updated | Hop execution begins |
| 2.8 | First hop execution completes | System | IN_PROGRESS → IN_PROGRESS | EXECUTING → COMPLETED | Mission: current_hop_id reset to null<br>Hop #1: marked completed | Hop done, mission ready for next hop |
| 3.1 | User requests second hop plan | User | IN_PROGRESS → IN_PROGRESS | *None* → HOP_PLAN_STARTED | Mission: current_hop_id set<br>Hop #2: created and linked | User clicks button, agent creates second hop |
| 3.2 | Agent completes hop plan | Agent | IN_PROGRESS (no change) | HOP_PLAN_STARTED → HOP_PLAN_PROPOSED | Hop #2 updated | Agent finishes planning, proposes to user |
| 3.3 | User approves hop plan | User | IN_PROGRESS (no change) | HOP_PLAN_PROPOSED → HOP_PLAN_READY | Hop #2 updated | Plan approved, ready for implementation |
| 3.4 | User requests implementation | User | IN_PROGRESS (no change) | HOP_PLAN_READY → HOP_IMPL_STARTED | Hop #2 updated | User clicks button, agent starts implementing |
| 3.5 | Agent completes implementation | Agent | IN_PROGRESS (no change) | HOP_IMPL_STARTED → HOP_IMPL_PROPOSED | Hop #2 updated | Agent finishes implementation, proposes to user |
| 3.6 | User approves implementation | User | IN_PROGRESS (no change) | HOP_IMPL_PROPOSED → HOP_IMPL_READY | Hop #2 updated | Final implementation approved |
| 3.7 | User triggers execution | User | IN_PROGRESS (no change) | HOP_IMPL_READY → EXECUTING | Hop #2 updated | Final hop execution begins |
| 3.8 | Final hop execution completes | System | IN_PROGRESS → COMPLETED | EXECUTING → COMPLETED | Mission: marked completed<br>Hop #2: marked completed | Mission completes when final hop done |

## State Summary

### Mission States Used
- **AWAITING_APPROVAL**: Initial state after agent proposal
- **IN_PROGRESS**: Active state during all hop work
- **COMPLETED**: Terminal state when final hop completes

### Hop States Used (per hop)
- **HOP_PLAN_STARTED**: Agent begins planning
- **HOP_PLAN_PROPOSED**: Plan ready for user review
- **HOP_PLAN_READY**: Plan approved by user
- **HOP_IMPL_STARTED**: Implementation begins
- **HOP_IMPL_PROPOSED**: Implementation ready for review
- **HOP_IMPL_READY**: Implementation approved
- **EXECUTING**: Hop running tool steps
- **COMPLETED**: Hop finished successfully

## Coordinated Update Patterns

### Single Entity Updates
Most triggers update only one entity:
- Steps 2.2-2.7, 3.2-3.7: Only hop state changes
- Step 1.2: Only mission state changes

### Multi-Entity Updates  
Some triggers coordinate updates across multiple entities:
- **Step 2.1, 3.1**: Mission links new hop (current_hop_id) + Hop created
- **Step 2.8**: Mission unlinks hop (current_hop_id=null) + Hop marked completed  
- **Step 3.8**: Mission completes + Final hop completes

### Critical Coordination Points
1. **Hop Creation** (2.1, 3.1): User button click triggers hop creation + mission.current_hop_id update
2. **Hop Completion** (2.8): Mission.current_hop_id must reset to null when hop completes
3. **Mission Completion** (3.8): Both mission and final hop transition to COMPLETED simultaneously

## Implementation Requirements

### Atomic Transactions
Coordinated updates must be atomic:
- Steps 2.1, 2.8, 3.1, 3.8 require database transactions
- If hop creation fails, mission.current_hop_id should not be set
- If hop completion fails, mission.current_hop_id should not reset

### State Validation  
Before transitions, validate:
- Mission is IN_PROGRESS before creating hops
- current_hop_id matches the hop being updated
- Final hop (is_final=true) completion triggers mission completion

## Actor Responsibilities

- **Agent**: Proposes missions, creates hop plans, implements tool steps, completes planning/implementation work
- **User**: Approves missions/plans/implementations, requests hop planning via button clicks, triggers execution  
- **System**: Handles completion events and coordinates mission/hop state updates

## User Interaction Patterns

### Button Clicks (UI Triggers)
- **Step 2.1, 3.1**: User clicks "Create Next Hop" button → Agent starts planning
- **Step 2.4, 3.4**: User clicks "Start Implementation" button → Agent begins implementation

### Approval Actions (Chat/UI)
- **Step 1.2**: User approves mission proposal
- **Step 2.3, 3.3**: User approves hop plans
- **Step 2.6, 3.6**: User approves implementations

### Execution Triggers (UI)
- **Step 2.7, 3.7**: User clicks "Execute Hop" button → Hop execution begins

### Agent Responses (Automatic)
- **Step 2.2, 3.2**: Agent automatically completes planning and proposes to user
- **Step 2.5, 3.5**: Agent automatically completes implementation and proposes to user