# State Transition Schema Updates - Implementation Guide

This document provides precise schema update rules for each state transition, ensuring consistent implementation across all transaction services.

## Update Rule Format

Each transition specifies:
- **Entity Updates**: Exact field changes with before/after values
- **Asset Management**: Creation, mapping, and promotion rules
- **Validation Rules**: Required status checks and business logic
- **Implementation Notes**: Critical details for service implementation

---

## **1.1 PROPOSE_MISSION**

### Entity Updates
```python
# Mission Creation
mission = Mission(
    id=uuid4(),
    name=mission_data['name'],
    description=mission_data.get('description'),
    goal=mission_data.get('goal'),
    success_criteria=mission_data.get('success_criteria', []),
    status=MissionStatus.AWAITING_APPROVAL,
    mission_metadata=mission_data.get('mission_metadata', {}),
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)
```

### Asset Management
```python
# For each asset in mission_data['mission_state']:
for asset_id, asset_data in mission_data['mission_state'].items():
    # 1. Create Asset
    created_asset_id = asset_service.create_asset(
        user_id=user_id,
        name=asset_data['name'],
        type=asset_data['schema_definition']['type'],
        subtype=asset_data.get('subtype'),
        description=asset_data.get('description'),
        content=asset_data.get('content'),
        scope_type="mission",
        scope_id=mission_id,
        role=asset_data.get('role', 'input')
    )
    
    # 2. Create MissionAsset mapping
    asset_mapping_service.add_mission_asset(
        mission_id=mission_id,
        asset_id=created_asset_id,
        role=AssetRole(asset_data.get('role', 'input'))
    )
```

### Validation Rules
- No validation required (creation operation)

### Session Integration
```python
# Link to user session (optional, non-blocking)
session_service.link_mission_to_session(user_id, mission_id, commit=False)
```

---

## **1.2 ACCEPT_MISSION**

### Entity Updates
```python
# Mission Status Update
mission.status = MissionStatus.IN_PROGRESS
mission.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert mission.status == MissionStatus.AWAITING_APPROVAL
assert mission.user_id == user_id
assert mission exists
```

---

## **2.1 START_HOP_PLAN** ❌ NOT IMPLEMENTED

### Entity Updates
```python
# Mission Update
mission.current_hop_id = hop_id
mission.updated_at = datetime.utcnow()

# Hop Creation  
hop = Hop(
    id=hop_id,
    mission_id=mission_id,
    user_id=user_id,
    sequence_order=next_sequence_order,
    name=hop_data.get('name', f'Hop {sequence_order}'),
    description=hop_data.get('description'),
    goal=hop_data.get('goal'),
    status=HopStatus.HOP_PLAN_STARTED,
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)
```

### Asset Management
- No assets created (happens in 2.2)

### Validation Rules
```python
# Required Status Check
assert mission.status == MissionStatus.IN_PROGRESS
assert mission.user_id == user_id
```

---

## **2.2 PROPOSE_HOP_PLAN** ❌ NOT IMPLEMENTED

### Entity Updates
```python
# Hop Status Update + Plan Details
hop.status = HopStatus.HOP_PLAN_PROPOSED
hop.description = hop_data.get('description')
hop.goal = hop_data.get('goal')
hop.rationale = hop_data.get('rationale')
hop.success_criteria = hop_data.get('success_criteria', [])
hop.is_final = hop_data.get('is_final', False)
hop.intended_input_asset_ids = hop_data.get('intended_input_asset_ids', [])
hop.intended_output_asset_ids = hop_data.get('intended_output_asset_ids', [])
hop.intended_output_asset_specs = hop_data.get('intended_output_asset_specs', [])
hop.updated_at = datetime.utcnow()
```

### Asset Management
```python
# 1. Add INPUT assets to hop working set
for input_asset_id in hop_lite.inputs:  # List[str] - existing mission assets
    # Add to HopAsset mapping - hop will use this existing mission asset
    asset_mapping_service.add_hop_asset(
        hop_id=hop_id,
        asset_id=input_asset_id,
        role=AssetRole.INPUT
    )

# 2. Handle OUTPUT asset (union type: NewAssetOutput | ExistingAssetOutput)
output_spec = hop_lite.output

if output_spec.type == "new_asset":
    # Create NEW mission-scoped intermediate asset
    created_asset_id = asset_service.create_asset(
        user_id=user_id,
        name=output_spec.asset.name,
        type=output_spec.asset.schema_definition.type,
        subtype=output_spec.asset.get('subtype'),
        description=output_spec.asset.get('description'),
        content="",  # Empty initially - populated during execution
        scope_type='mission',  # MISSION scope
        scope_id=mission_id,
        role='intermediate',  # INTERMEDIATE from mission perspective
        asset_metadata={
            'created_by_hop': hop_id,
            'hop_name': hop_data.get('name'),
            'created_at': datetime.utcnow().isoformat()
        }
    )
    
    # Add to MissionAsset mapping as INTERMEDIATE
    asset_mapping_service.add_mission_asset(
        mission_id=mission_id,
        asset_id=created_asset_id,
        role=AssetRole.INTERMEDIATE
    )
    
    # Add to HopAsset mapping as OUTPUT (hop's deliverable)
    asset_mapping_service.add_hop_asset(
        hop_id=hop_id,
        asset_id=created_asset_id,
        role=AssetRole.OUTPUT
    )

elif output_spec.type == "existing_asset":
    # Reference existing mission asset (input or output)
    existing_asset_id = output_spec.mission_asset_id
    
    # Add to HopAsset mapping as OUTPUT (hop will update/produce this)
    asset_mapping_service.add_hop_asset(
        hop_id=hop_id,
        asset_id=existing_asset_id,
        role=AssetRole.OUTPUT
    )
```

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_PLAN_STARTED
assert hop.user_id == user_id
assert mission.status == MissionStatus.IN_PROGRESS
```

---

## **2.3 ACCEPT_HOP_PLAN**

### Entity Updates
```python
# Hop Status Update
hop.status = HopStatus.HOP_PLAN_READY
hop.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_PLAN_PROPOSED
assert hop.user_id == user_id
```

---

## **2.4 START_HOP_IMPL** ❌ NOT IMPLEMENTED

### Entity Updates
```python
# Hop Status Update
hop.status = HopStatus.HOP_IMPL_STARTED
hop.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_PLAN_READY
assert hop.user_id == user_id
```

---

## **2.5 PROPOSE_HOP_IMPL** ❌ NOT IMPLEMENTED

### Entity Updates
```python
# Hop Status Update
hop.status = HopStatus.HOP_IMPL_PROPOSED
hop.updated_at = datetime.utcnow()
```

### Tool Step Creation
```python
# Create ToolSteps
for i, tool_step_data in enumerate(tool_steps):
    tool_step = ToolStep(
        id=uuid4(),
        hop_id=hop_id,
        user_id=user_id,
        tool_id=tool_step_data['tool_id'],
        sequence_order=i + 1,
        name=tool_step_data.get('name', f'Step {i + 1}'),
        description=tool_step_data.get('description'),
        status=ToolExecutionStatus.PROPOSED,
        parameter_mapping=serialize_mappings(tool_step_data.get('parameter_mapping', {})),
        result_mapping=serialize_mappings(tool_step_data.get('result_mapping', {})),
        resource_configs=tool_step_data.get('resource_configs', {}),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
```

### Asset Management
- No asset changes (assets created during execution)

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_IMPL_STARTED
assert hop.user_id == user_id
```

---

## **2.6 ACCEPT_HOP_IMPL**

### Entity Updates
```python
# Hop Status Update
hop.status = HopStatus.HOP_IMPL_READY
hop.updated_at = datetime.utcnow()
```

### Tool Step Updates
```python
# Update ALL tool steps in hop
tool_steps = get_tool_steps_by_hop(hop_id, user_id)
for tool_step in tool_steps:
    if tool_step.status == ToolExecutionStatus.PROPOSED:
        tool_step.status = ToolExecutionStatus.READY_TO_EXECUTE
        tool_step.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_IMPL_PROPOSED
assert hop.user_id == user_id
```

---

## **2.7 EXECUTE_HOP**

### Entity Updates
```python
# Hop Status Update
hop.status = HopStatus.EXECUTING
hop.updated_at = datetime.utcnow()
```

### Tool Step Updates
```python
# Update FIRST tool step only
first_tool_step = get_first_tool_step(hop_id, user_id)
if first_tool_step and first_tool_step.status == ToolExecutionStatus.READY_TO_EXECUTE:
    first_tool_step.status = ToolExecutionStatus.EXECUTING
    first_tool_step.started_at = datetime.utcnow()
    first_tool_step.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.HOP_IMPL_READY
assert hop.user_id == user_id
```

---

## **2.8 COMPLETE_TOOL_STEP**

### Entity Updates
```python
# Tool Step Completion
tool_step.status = ToolExecutionStatus.COMPLETED
tool_step.execution_result = execution_result
tool_step.completed_at = datetime.utcnow()
tool_step.updated_at = datetime.utcnow()

if not tool_step.started_at:
    tool_step.started_at = datetime.utcnow()
```

### Asset Management
```python
# Extract tool outputs and map to assets
tool_outputs = execution_result.get("outputs", {})
result_mapping = tool_step.result_mapping or {}

for output_name, mapping_config in result_mapping.items():
    if output_name in tool_outputs and mapping_config.get('type') == 'asset_field':
        asset_id = mapping_config.get('state_asset')
        output_value = tool_outputs[output_name]
        
        # Check if this is an existing asset or needs to be created
        existing_asset = asset_service.get_asset_by_id(asset_id, user_id)
        
        if existing_asset:
            # Update existing asset (mission-scoped or hop-scoped)
            asset_service.update_asset(
                asset_id=asset_id,
                user_id=user_id,
                updates={
                    'content': output_value,
                    'asset_metadata': {
                        **existing_asset.asset_metadata,
                        'updated_by_tool': tool_step.tool_id,
                        'tool_step_id': tool_step.id,
                        'output_name': output_name,
                        'updated_at': datetime.utcnow().isoformat()
                    }
                }
            )
        else:
            # Create new hop-scoped intermediate asset for tool working data
            created_asset_id = asset_service.create_asset(
                user_id=user_id,
                name=f"Tool {tool_step.tool_id} Output",
                type=determine_asset_type(output_value),
                description=f"Intermediate output from {tool_step.name}",
                content=output_value,
                scope_type='hop',  # HOP scope for tool intermediates
                scope_id=tool_step.hop_id,
                role='intermediate',
                asset_metadata={
                    'generated_by_tool': tool_step.tool_id,
                    'tool_step_id': tool_step.id,
                    'output_name': output_name,
                    'created_at': datetime.utcnow().isoformat()
                }
            )
            
            # Add to HopAsset mapping as INTERMEDIATE
            asset_mapping_service.add_hop_asset(
                hop_id=tool_step.hop_id,
                asset_id=created_asset_id,
                role=AssetRole.INTERMEDIATE
            )
```

### Validation Rules
```python
# Required Status Check
assert tool_step.status in [
    ToolExecutionStatus.PROPOSED,
    ToolExecutionStatus.READY_TO_EXECUTE, 
    ToolExecutionStatus.EXECUTING
]
assert tool_step.user_id == user_id
```

---

## **2.9 COMPLETE_HOP**

### Entity Updates
```python
# Hop Completion
hop.status = HopStatus.COMPLETED
hop.is_resolved = True
hop.updated_at = datetime.utcnow()

if execution_result:
    hop.hop_metadata = {
        **hop.hop_metadata,
        'execution_result': execution_result,
        'completed_at': datetime.utcnow().isoformat()
    }

# Mission Update (conditional)
if hop.is_final:
    mission.status = MissionStatus.COMPLETED
    mission.updated_at = datetime.utcnow()
else:
    mission.current_hop_id = None
    mission.updated_at = datetime.utcnow()
```

### Asset Management
```python
# Promote hop OUTPUT assets to mission scope
hop_output_assets = asset_mapping_service.get_hop_assets(hop_id, AssetRole.OUTPUT)

for hop_asset in hop_output_assets:
    # Create promoted asset at mission scope
    promoted_asset_id = asset_service.create_asset(
        user_id=user_id,
        name=hop_asset.name,
        type=hop_asset.schema_definition.type,
        subtype=hop_asset.subtype,
        description=hop_asset.description,
        content=hop_asset.value_representation,
        scope_type='mission',
        scope_id=mission_id,
        role='output',
        asset_metadata={
            **hop_asset.asset_metadata,
            'promoted_from_hop': hop_id,
            'promoted_at': datetime.utcnow().isoformat()
        }
    )
    
    # Add to MissionAsset mapping
    asset_mapping_service.add_mission_asset(
        mission_id=mission_id,
        asset_id=promoted_asset_id,
        role=AssetRole.OUTPUT
    )
```

### Validation Rules
```python
# Required Status Check
assert hop.status == HopStatus.EXECUTING
assert hop.user_id == user_id

# Business Rule Check
all_tool_steps = get_tool_steps_by_hop(hop_id, user_id)
assert all(step.status == ToolExecutionStatus.COMPLETED for step in all_tool_steps)
```

---

## **2.10 COMPLETE_MISSION**

### Entity Updates
```python
# Mission Completion
mission.status = MissionStatus.COMPLETED
mission.updated_at = datetime.utcnow()
```

### Asset Management
- No asset changes

### Validation Rules
```python
# Required Status Check
assert mission.user_id == user_id
# Note: Can be called from any mission status for exceptional cases
```

---

## Asset Scoping and Roles - Complete Understanding

### Mission-Scoped Assets (live in mission scope forever)

- **Mission Inputs/Outputs**: Defined at mission creation, permanent mission deliverables
- **Mission Intermediates**: Created by hops as working artifacts, but not mission deliverables

### Hop-Scoped Assets (temporary, only during hop execution)

- **Hop Intermediates**: Temporary working assets created during tool step execution
- These are the "scratch pad" assets that tools use for intermediate calculations
- They don't get promoted to mission scope - they're just execution artifacts

### The Flow:

1. **During 2.2 PROPOSE_HOP_PLAN**:
   - **Input assets**: Reference existing mission assets → `hop_asset_map` as INPUT
   - **New assets**: Create at mission scope as INTERMEDIATE → `mission_asset_map` as INTERMEDIATE, `hop_asset_map` as OUTPUT
   - **Existing assets**: Reference existing mission assets → `hop_asset_map` as OUTPUT

2. **During tool execution**:
   - Tools may create hop-scoped intermediate assets for working data
   - These assets exist only for the duration of the hop execution
   - They are NOT promoted to mission scope when the hop completes

3. **Key Distinction**:
   - **Mission-scoped intermediates**: Created by hops but persist at mission level (deliverables)
   - **Hop-scoped intermediates**: Created by tool steps but discarded after hop completion (scratch work)

---

## Implementation Helpers

### Serialization Functions
```python
def serialize_mappings(mappings: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize parameter_mapping or result_mapping to JSON-compatible format"""
    if not mappings:
        return {}
    
    return {
        key: mapping.model_dump() if hasattr(mapping, 'model_dump') else mapping
        for key, value in mappings.items()
    }
```

### Status Validation
```python
def validate_transition(entity_type: str, entity_id: str, 
                       current_status: str, expected_status: str) -> None:
    """Validate that a state transition is allowed"""
    if current_status != expected_status:
        raise StateTransitionError(
            f"{entity_type} {entity_id} must be {expected_status}, current: {current_status}"
        )
```

### Asset Mapping Helpers
```python
# AssetMappingService required methods:
# - add_mission_asset(mission_id, asset_id, role)
# - add_hop_asset(hop_id, asset_id, role) 
# - get_mission_assets(mission_id, role=None)
# - get_hop_assets(hop_id, role=None)
```

---

## Critical Implementation Notes

### Transaction Atomicity
- All entity updates within a transition must commit together or rollback completely
- Asset creation and mapping updates must be part of the same database transaction
- Session linking failures should log warnings but not fail the transaction

### Asset Scope Rules
- **Mission assets**: Created with `scope_type='mission'`, `scope_id=mission_id`
- **Hop assets**: Created with `scope_type='hop'`, `scope_id=hop_id`
- **Asset promotion**: Hop outputs become new mission-scoped assets (not updates to existing)

### Status Progression Rules
- Each transition validates the current status before making changes
- Invalid status transitions throw `StateTransitionError` and rollback
- Tool steps progress: PROPOSED → READY_TO_EXECUTE → EXECUTING → COMPLETED

### Sequential Execution Rules
- Only the first tool step starts EXECUTING during EXECUTE_HOP
- Each COMPLETE_TOOL_STEP can advance the next step to EXECUTING
- Hop completion requires ALL tool steps to be COMPLETED

This guide ensures consistent implementation across all state transition services while maintaining database integrity and business rule compliance.