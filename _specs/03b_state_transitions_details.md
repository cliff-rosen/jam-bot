
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

## Precise Schema Update Rules

### **1.1 PROPOSE_MISSION**

#### Entity Updates
```python
# Mission Creation from MissionLite
mission = Mission(
    id=uuid4(),
    name=mission_lite.name,
    description=mission_lite.description,
    goal=mission_lite.goal,
    success_criteria=mission_lite.success_criteria,
    status=MissionStatus.AWAITING_APPROVAL,
    mission_metadata=mission_lite.mission_metadata,
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)
```

#### Asset Management
```python
# Process MissionLite schema assets:
for asset_data in mission_lite.assets:
    # 1. Create Asset
    created_asset_id = asset_service.create_asset(
        user_id=user_id,
        name=asset_data.name,
        schema_definition=asset_data.schema_definition,
        subtype=asset_data.subtype,
        description=asset_data.description,
        content=asset_data.content,
        scope_type="mission",
        scope_id=mission_id,
        role=asset_data.role,
        asset_metadata=asset_data.asset_metadata
    )
    
    # 2. Create MissionAsset mapping
    asset_mapping_service.add_mission_asset(
        mission_id=mission_id,
        asset_id=created_asset_id,
        role=asset_data.role
    )
```

### **1.2 ACCEPT_MISSION**

#### Entity Updates
```python
# Mission Status Update
mission.status = MissionStatus.IN_PROGRESS
mission.updated_at = datetime.utcnow()
```

#### Validation Rules
```python
# Required Status Check
assert mission.status == MissionStatus.AWAITING_APPROVAL
assert mission.user_id == user_id
assert mission exists
```

### **2.2 PROPOSE_HOP_PLAN** ❌ NOT IMPLEMENTED

#### Entity Updates
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

#### Asset Management
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

### **2.8 COMPLETE_TOOL_STEP**

#### Asset Management
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

This document ensures consistent implementation across all state transition services while maintaining database integrity and business rule compliance.