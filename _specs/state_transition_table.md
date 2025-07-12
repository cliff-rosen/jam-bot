# State Transition Table

This table shows every state transition in the mission and hop system, with one row per transition.

| Step | Entity | Trigger | From State | To State | Actor | Notes |
|------|--------|---------|------------|----------|-------|-------|
| 1.1 | Mission | Agent proposes mission | *None* | AWAITING_APPROVAL | Agent | Mission created with input/output assets |
| 1.2 | Mission | User approves mission | AWAITING_APPROVAL | IN_PROGRESS | User | Mission ready for hop work |
| 2.1 | Mission | Agent starts first hop | IN_PROGRESS | IN_PROGRESS | Agent | current_hop_id set to new hop |
| 2.1 | Hop #1 | Agent starts hop planning | *None* | HOP_PLAN_STARTED | Agent | First hop created and linked |
| 2.2 | Hop #1 | Agent completes hop plan | HOP_PLAN_STARTED | HOP_PLAN_PROPOSED | Agent | Plan ready for user review |
| 2.3 | Hop #1 | User approves hop plan | HOP_PLAN_PROPOSED | HOP_PLAN_READY | User | Plan approved, ready for implementation |
| 2.4 | Hop #1 | Agent starts implementation | HOP_PLAN_READY | HOP_IMPL_STARTED | Agent | Implementation phase begins |
| 2.5 | Hop #1 | Agent completes implementation | HOP_IMPL_STARTED | HOP_IMPL_PROPOSED | Agent | Implementation ready for review |
| 2.6 | Hop #1 | User approves implementation | HOP_IMPL_PROPOSED | HOP_IMPL_READY | User | Implementation approved |
| 2.7 | Hop #1 | User triggers execution | HOP_IMPL_READY | EXECUTING | User | Hop execution begins |
| 2.8 | Hop #1 | Hop execution completes | EXECUTING | COMPLETED | System | All tool steps completed successfully |
| 2.8 | Mission | First hop completes | IN_PROGRESS | IN_PROGRESS | System | current_hop_id reset to null |
| 3.1 | Mission | Agent starts second hop | IN_PROGRESS | IN_PROGRESS | Agent | current_hop_id set to new hop |
| 3.1 | Hop #2 | Agent starts hop planning | *None* | HOP_PLAN_STARTED | Agent | Second hop created and linked |
| 3.2 | Hop #2 | Agent completes hop plan | HOP_PLAN_STARTED | HOP_PLAN_PROPOSED | Agent | Plan ready for user review |
| 3.3 | Hop #2 | User approves hop plan | HOP_PLAN_PROPOSED | HOP_PLAN_READY | User | Plan approved, ready for implementation |
| 3.4 | Hop #2 | Agent starts implementation | HOP_PLAN_READY | HOP_IMPL_STARTED | Agent | Implementation phase begins |
| 3.4 | Hop #2 | Agent completes implementation | HOP_IMPL_STARTED | HOP_IMPL_PROPOSED | Agent | Implementation ready for review |
| 3.5 | Hop #2 | User approves implementation | HOP_IMPL_PROPOSED | HOP_IMPL_READY | User | Final implementation approved |
| 3.6 | Hop #2 | User triggers execution | HOP_IMPL_READY | EXECUTING | User | Final hop execution begins |
| 3.7 | Hop #2 | Final hop execution completes | EXECUTING | COMPLETED | System | Final hop completed (is_final=true) |
| 3.7 | Mission | Final hop completes | IN_PROGRESS | COMPLETED | System | Mission completes when final hop done |

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

## Key Patterns

1. **User Approval Gates**: Steps 2.3, 2.6, 3.3, 3.5 require user approval
2. **User Execution Triggers**: Steps 2.7, 3.6 require user to start execution
3. **Mission Coordination**: Mission state updates when hops complete
4. **Hop Lifecycle**: Each hop follows identical 7-state progression
5. **Final Hop**: Last hop completion triggers mission completion

## Actor Responsibilities

- **Agent**: Proposes missions, creates plans, implements tool steps
- **User**: Approves plans/implementations, triggers execution
- **System**: Handles completion events and state coordination