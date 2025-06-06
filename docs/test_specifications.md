# Mission State Transition Test Specifications

## Overview
This document outlines test specifications for validating the formation and state transitions of mission objects, with particular focus on asset mappings, state management, and schema conformance.

## State Transitions
The system has three main state transitions:
1. New Mission Creation
2. New Hop Creation
3. Hop Resolution

## Test Categories

### 1. Mission Creation Tests

#### Asset Validation
- [ ] Verify all input assets exist and conform to Asset schema
- [ ] Verify all output assets exist and conform to Asset schema
- [ ] Check that input/output assets have unique IDs
- [ ] Validate asset metadata is properly populated
- [ ] Verify asset types match their declared purposes

#### State Initialization
- [ ] Verify mission state is initialized as empty object
- [ ] Check mission_status is set to PENDING
- [ ] Verify hop_status is undefined for new missions
- [ ] Validate current_hop_index is 0
- [ ] Check hops array is initialized as empty

#### Metadata Validation
- [ ] Verify required mission fields (id, name, description, goal)
- [ ] Check success_criteria is a non-empty array
- [ ] Validate created_at and updated_at timestamps
- [ ] Verify metadata object exists

### 2. Hop Creation Tests

#### Asset Mapping Validation
- [ ] Verify input_mapping keys exist in mission state
- [ ] Check input_mapping values reference valid asset IDs
- [ ] Validate output_mapping keys are unique
- [ ] Verify output_mapping values are valid asset IDs
- [ ] Check that mapped assets exist in mission state

#### Hop State Management
- [ ] Verify hop state is initialized with mapped assets
- [ ] Check status is set to PENDING
- [ ] Validate is_resolved is false
- [ ] Verify current_step_index is 0
- [ ] Check steps array is initialized as empty

#### Hop Metadata
- [ ] Verify required hop fields (id, name, description)
- [ ] Check created_at and updated_at timestamps
- [ ] Validate is_final flag is properly set

### 3. Hop Resolution Tests

#### Tool Step Validation
- [ ] Verify each tool step has valid tool_id
- [ ] Check parameter_mapping references exist in hop state
- [ ] Validate result_mapping references exist in hop state
- [ ] Verify step status is PENDING
- [ ] Check created_at and updated_at timestamps

#### Asset Resolution
- [ ] Verify all parameter_mapping assets exist in hop state
- [ ] Check result_mapping assets exist in hop state
- [ ] Validate asset types match tool requirements
- [ ] Verify collection types are properly handled
- [ ] Check asset metadata is preserved

#### State Updates
- [ ] Verify is_resolved is set to true
- [ ] Check status is updated to HOP_READY_TO_EXECUTE
- [ ] Validate hop_status in mission is updated
- [ ] Verify current_hop_index is updated
- [ ] Check mission state is updated with hop outputs

### 4. Cross-Transition Tests

#### Mission State Consistency
- [ ] Verify mission state contains all input assets
- [ ] Check mission state contains all hop outputs
- [ ] Validate no duplicate asset IDs in mission state
- [ ] Verify asset references remain valid across transitions
- [ ] Check metadata consistency across transitions

#### Hop Sequence Validation
- [ ] Verify hops array order matches execution sequence
- [ ] Check current_hop_index is valid
- [ ] Validate hop dependencies are satisfied
- [ ] Verify final hop is properly marked
- [ ] Check hop status transitions are valid

#### Asset Lifecycle
- [ ] Verify assets are properly created in mission state
- [ ] Check assets are correctly mapped in hops
- [ ] Validate assets are properly updated by tool steps
- [ ] Verify final assets match output specifications
- [ ] Check asset metadata is maintained throughout lifecycle

## Implementation Notes

### Test Data Requirements
- Sample missions with various asset types
- Hops with different tool configurations
- Tool steps with various parameter/result mappings
- Edge cases (empty collections, null values, etc.)

### Validation Priorities
1. Asset existence and type validation
2. Mapping resolution
3. State consistency
4. Metadata integrity
5. Transition sequence

### Error Cases to Test
- Missing required fields
- Invalid asset references
- Type mismatches
- Duplicate IDs
- Invalid state transitions
- Broken asset mappings 