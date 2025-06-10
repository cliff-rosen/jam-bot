from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import ValidationError

from ..schemas.workflow import Mission, MissionStatus, HopStatus, ExecutionStatus
from ..schemas.asset import Asset, AssetType

class MissionValidationError(Exception):
    """Custom exception for mission validation errors"""
    pass

def validate_mission(mission: Mission) -> List[str]:
    """
    Validates a mission object against key rules and relationships.
    Returns a list of validation error messages.
    """
    errors = []

    # 1. Basic Mission Structure
    if not mission.id:
        errors.append("Mission must have an ID")
    if not mission.name:
        errors.append("Mission must have a name")
    if not mission.description:
        errors.append("Mission must have a description")
    if not mission.goal:
        errors.append("Mission must have a goal")
    if not mission.success_criteria:
        errors.append("Mission must have success criteria")

    # 2. Asset Validation
    # Check for duplicate asset IDs
    asset_ids = set()
    for asset in mission.inputs + mission.outputs:
        if asset.id in asset_ids:
            errors.append(f"Duplicate asset ID found: {asset.id}")
        asset_ids.add(asset.id)

    # 3. State Validation
    # Check that all input assets are in state
    for input_asset in mission.inputs:
        if input_asset.id not in mission.mission_state:
            errors.append(f"Input asset {input_asset.id} not found in mission state")

    # 4. Hop Validation
    if mission.hops:
        # Check hop sequence
        for i, hop in enumerate(mission.hops):
            # Verify hop index matches array position
            if i != mission.current_hop_index and hop.id == mission.current_hop.id:
                errors.append(f"Current hop index {mission.current_hop_index} doesn't match hop position {i}")

            # Check hop status consistency
            if hop.status == ExecutionStatus.PENDING and mission.hop_status != HopStatus.HOP_READY_TO_EXECUTE:
                errors.append(f"Inconsistent status: hop {hop.id} is PENDING but mission hop_status is {mission.hop_status}")

            # Check hop asset mappings
            for input_key, asset_id in hop.input_mapping.items():
                if asset_id not in mission.mission_state:
                    errors.append(f"Hop {hop.id} input mapping references non-existent asset: {asset_id}")

            for output_key, asset_id in hop.output_mapping.items():
                if asset_id not in mission.mission_state:
                    errors.append(f"Hop {hop.id} output mapping references non-existent asset: {asset_id}")

    # 5. Status Validation
    if mission.mission_status == MissionStatus.ACTIVE:
        if not mission.hop_status:
            errors.append("Active mission must have a hop_status")
        if not mission.current_hop:
            errors.append("Active mission must have a current_hop")

    # 6. Metadata Validation
    if not isinstance(mission.metadata, dict):
        errors.append("Mission metadata must be a dictionary")

    # 7. Timestamp Validation
    if not isinstance(mission.created_at, datetime):
        errors.append("Mission must have a valid created_at timestamp")
    if not isinstance(mission.updated_at, datetime):
        errors.append("Mission must have a valid updated_at timestamp")
    if mission.updated_at < mission.created_at:
        errors.append("Mission updated_at timestamp cannot be before created_at")

    return errors

def test_mission_validation():
    """Example test function showing how to use the validator"""
    # Create a test mission
    test_mission = Mission(
        id="test-01",
        name="Test Mission",
        description="A test mission",
        goal="Test the mission validator",
        success_criteria=["Test passes"],
        inputs=[],
        outputs=[],
        mission_state={},
        hops=[],
        current_hop_index=0,
        mission_status=MissionStatus.PENDING,
        metadata={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    # Validate the mission
    errors = validate_mission(test_mission)
    
    # Print results
    if errors:
        print("Validation failed with errors:")
        for error in errors:
            print(f"- {error}")
    else:
        print("Mission validation passed!")

if __name__ == "__main__":
    test_mission_validation() 