Agent Node Responsibilities
## Agent Node Responsibilities

### Supervisor Node
- **Purpose**: Traffic controller based on mission and hop status
- **Input**: Any state
- **Routing Logic**:
  - No mission → mission_specialist_node
  - mission.status = PENDING → END (wait for approval)
  - mission.status = ACTIVE, no current_hop → hop_designer_node
  - mission.status = HOP_DESIGN → END (wait for hop approval)
  - hop.status = READY → hop_implementer_node
  - mission.status = COMPLETED → END

### Mission Specialist Node
- **Purpose**: Define missions based on user requests
- **Input**: User request, no mission or mission.status = PENDING
- **Output**: Complete mission with status = PENDING
- **User Interaction**: Mission plan shown for approval

### Hop Designer Node
- **Purpose**: Strategic hop planning with lookahead
- **Input**: mission.status = ACTIVE, no current_hop
- **Output**: Hop design + anticipated sequence
- **Strategic Logic**: One hop from finish vs. multi-hop sequence
- **User Interaction**: Hop + sequence shown for validation

### Hop Implementer Node
- **Purpose**: Resolve hop with concrete tool chain and execute
- **Input**: hop.status = READY
- **Output**: Executed hop, updated mission.state
- **No User Interaction**: Fully automated execution

## Key Design Principles
- **User Collaboration**: System proposes, user approves at key decision points
- **Strategic Lookahead**: Show anticipated sequence for directional validation
- **Incremental Execution**: Execute one hop at a time with re-evaluation
- **Asset Flow**: All intermediate results stored in mission.state
- **Status-Driven Routing**: Clear status transitions drive workflow
