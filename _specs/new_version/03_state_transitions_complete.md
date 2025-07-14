# State Transitions - Complete Reference

This document consolidates all state transition information including the master table, precise implementation rules, and asset scoping guidelines.

## State Transition Master Table

This is the comprehensive reference for all state transitions in the system, consolidating implementation status, entity updates, triggers, and business rules.

| Step | Transition | Status | Trigger | Caller | User Session | Mission | Hop | Tool Step | Asset | Business Rules |
|------|------------|--------|---------|---------|-------------|---------|-----|-----------|-------|:---------------|
| **1.1** | PROPOSE_MISSION | ✅ IMPLEMENTED | Agent completes mission planning | `mission_specialist_node` in primary_agent.py | Links mission to active session | Creates with `status=AWAITING_APPROVAL` | No changes | No changes | Creates mission-scoped assets from mission_state data | Mission created in approval state, automatically linked to user's active session |
| **1.2** | ACCEPT_MISSION | ✅ IMPLEMENTED | User clicks "Approve Mission" button | `acceptMissionProposal()` → stateTransitionApi.acceptMission() | No changes | Updates `status=IN_PROGRESS`, `updated_at=now()` | No changes | No changes | No changes | Mission approved by user, ready for hop planning |
| **2.1** | START_HOP_PLAN | ❌ NOT IMPLEMENTED | User requests hop planning via chat | User message → `hop_designer_node` | No changes | Sets `current_hop_id=hop_id`, `updated_at=now()` | Creates with `status=HOP_PLAN_STARTED` | No changes | No changes | User initiates hop planning. Hop created in started state. Agent begins planning |
| **2.2** | PROPOSE_HOP_PLAN | ❌ NOT IMPLEMENTED | Agent completes hop design | `hop_designer_node` → stateTransitionApi.proposeHopPlan() | No changes | No changes | **Updates hop with completed plan details (description, goal, rationale, success_criteria), sets `status=HOP_PLAN_PROPOSED`, `updated_at=now()`, stores intended_input_asset_ids and intended_output_asset_ids** | No changes | **Creates new mission output assets at MISSION scope (from intended_output_asset_specs), adds to mission asset mapping. No hop-scoped assets created** | Agent completes design and proposes to user. New mission output assets created for hop deliverables. Hop tracks intended inputs/outputs via asset IDs |
| **2.3** | ACCEPT_HOP_PLAN | ✅ IMPLEMENTED | User clicks "Accept Hop Plan" button | `acceptHopProposal()` → stateTransitionApi.acceptHopPlan() | No changes | No changes | Updates `status=HOP_PLAN_READY`, `updated_at=now()` | No changes | No changes | User approves hop plan. Ready for implementation |
| **2.4** | START_HOP_IMPL | ❌ NOT IMPLEMENTED | User requests implementation via chat | User message → `hop_implementer_node` | No changes | No changes | Updates `status=HOP_IMPL_STARTED`, `updated_at=now()` | No changes | No changes | User initiates implementation. Agent begins creating tool steps |
| **2.5** | PROPOSE_HOP_IMPL | ❌ NOT IMPLEMENTED | Agent completes implementation design | `hop_implementer_node` → stateTransitionApi.proposeHopImpl() | No changes | No changes | Updates `status=HOP_IMPL_PROPOSED`, `updated_at=now()` | **Creates tool steps with `status=PROPOSED`, serializes parameter_mapping and result_mapping** | No changes | Agent proposes executable tool steps with serialized mappings. Implementation ready for approval |
| **2.6** | ACCEPT_HOP_IMPL | ✅ IMPLEMENTED | User clicks "Accept Implementation" button | `acceptHopImplementationProposal()` → stateTransitionApi.acceptHopImplementation() | No changes | No changes | Updates `status=HOP_IMPL_READY`, `updated_at=now()` | **Updates all steps from PROPOSED to READY_TO_EXECUTE, sets updated_at=now()** | No changes | User approves implementation. All tool steps ready for execution |
| **2.7** | EXECUTE_HOP | ✅ IMPLEMENTED | User clicks "Start Execution" button | `startHopExecution()` → stateTransitionApi.executeHop() | No changes | No changes | Updates `status=EXECUTING`, `updated_at=now()` | **Updates first step to EXECUTING, sets started_at=now() and updated_at=now()** | No changes | Hop execution begins. First tool step starts executing |
| **2.8** | COMPLETE_TOOL_STEP | ✅ IMPLEMENTED | Tool execution completes (or simulated) | Tool engine → stateTransitionApi.completeToolStep() | No changes | No changes | No changes | **Updates step to COMPLETED, sets execution_result, completed_at=now(), started_at=now() if not set** | **Creates hop-scoped output assets based on result_mapping and execution outputs** | Individual tool step completion with output asset creation. Simulated execution supported for testing |
| **2.9** | COMPLETE_HOP | ✅ IMPLEMENTED | All tool steps completed | System detection → stateTransitionApi.completeHop() | No changes | **If final hop**: `status=COMPLETED`, `updated_at=now()`<br>**If non-final hop**: `current_hop_id=null`, `updated_at=now()` | Updates `status=COMPLETED`, `is_resolved=true`, `updated_at=now()`, adds execution_result to hop_metadata | No changes | **Promotes hop output assets to mission scope with promotion metadata** | **Hop completion triggers asset promotion. Final hop completes entire mission** |
| **2.10** | COMPLETE_MISSION | ✅ IMPLEMENTED | Manual mission completion | Direct API call → stateTransitionApi.completeMission() | No changes | Updates `status=COMPLETED`, `updated_at=now()` | No changes | No changes | No changes | Manual mission completion endpoint for exceptional cases |

## Implementation Status Summary

- **✅ Implemented (6/10 transitions): 60%**
- **❌ Not Implemented (4/10 transitions): 40%**

## Critical Missing Implementations

### Planning Workflow (Steps 2.1, 2.2)
- **Missing API Methods**: `startHopPlan()`, `proposeHopPlan()`
- **Missing Transitions**: User request → `HOP_PLAN_STARTED`, Agent completion → `HOP_PLAN_PROPOSED`
- **Backend**: StateTransitionService needs `START_HOP_PLAN` and `PROPOSE_HOP_PLAN` transaction types
- **Current Issue**: Implementation bypasses `HOP_PLAN_STARTED` state and goes directly to `HOP_PLAN_PROPOSED`

### Implementation Workflow (Steps 2.4, 2.5)
- **Missing API Methods**: `startHopImpl()`, `proposeHopImpl()`
- **Missing Transitions**: User request → `HOP_IMPL_STARTED`, Agent completion → `HOP_IMPL_PROPOSED`
- **Backend**: StateTransitionService needs `START_HOP_IMPL` and `PROPOSE_HOP_IMPL` transaction types
- **Current Issue**: Implementation bypasses `HOP_IMPL_STARTED` state and goes directly to `HOP_IMPL_PROPOSED`

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

#### Asset Management
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