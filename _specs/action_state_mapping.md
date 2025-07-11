# Action to State Mapping

This document provides a simple reference table showing how user and agent actions map to mission and hop states.

| Action | Mission State | Hop State |
|--------|---------------|-----------|
| Agent proposes mission | `PROPOSED` | *No hop exists* |
| User accepts mission | `READY_FOR_NEXT_HOP` | *No hop exists* |
| Agent proposes hop design | `BUILDING_HOP` | `PROPOSED` |
| User accepts hop design | `BUILDING_HOP` | `READY_TO_RESOLVE` |
| Agent proposes hop implementation | `BUILDING_HOP` | `READY_TO_EXECUTE` |
| User accepts hop implementation | `HOP_READY_TO_EXECUTE` | `READY_TO_EXECUTE` |
| User runs hop | `EXECUTING_HOP` | `EXECUTING` |
| Hop completes (non-final) | `READY_FOR_NEXT_HOP` | `COMPLETED` |
| Hop completes (final) | `COMPLETED` | `COMPLETED` |

## Notes

- **Mission State**: The status of the overall mission
- **Hop State**: The status of the current hop being worked on
- **State Coordination**: Mission and hop states are automatically coordinated when hop status changes
- **Hop Lifecycle**: Each hop goes through the same cycle (proposed → accepted → implemented → executed → completed)
- **Mission Progression**: Mission advances through states as hops progress, completing when the final hop finishes

## State Transition Triggers

- **Agent Actions**: Create new entities in `PROPOSED` state
- **User Acceptances**: Advance entities to next processing state
- **System Events**: Automatic state coordination and completion detection 