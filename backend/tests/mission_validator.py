from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import ValidationError

from ..schemas.workflow import Mission, MissionStatus, HopStatus
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
    # Check for duplicate asset IDs in mission_state
    asset_ids = set()
    if mission.mission_state:
        for asset in mission.mission_state.values():
            if asset.id in asset_ids:
                errors.append(f"Duplicate asset ID found: {asset.id}")
            asset_ids.add(asset.id)

    # 3. State Validation
    # Check that mission_state assets have consistent names and IDs
    if mission.mission_state:
        for asset_id, asset in mission.mission_state.items():
            if asset.id != asset_id:
                errors.append(f"Asset key '{asset_id}' does not match asset ID '{asset.id}'")

    # 4. Hop Validation
    if mission.hops:
        # Check hop status consistency
        for i, hop in enumerate(mission.hops):
            # Check hop status consistency with mission status
            if hop.status == HopStatus.PROPOSED and mission.current_hop and mission.current_hop.status != HopStatus.READY_TO_EXECUTE:
                errors.append(f"Inconsistent status: hop {hop.id} is PROPOSED but mission current_hop status is {mission.current_hop.status}")
            
            # Check hop order
            if i > 0:
                prev_hop = mission.hops[i-1]
                if prev_hop.created_at > hop.created_at:
                    errors.append(f"Hop {hop.id} created before previous hop {prev_hop.id}")

    # 5. Status Validation
    if mission.status == MissionStatus.EXECUTING_HOP:
        if not mission.current_hop:
            errors.append("Active mission must have a current_hop")

    # 6. Metadata Validation
    if not isinstance(mission.mission_metadata, dict):
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
        status=MissionStatus.PROPOSED,
        current_hop_id=None,
        mission_metadata={},
        current_hop=None,
        hops=[],
        mission_state={},
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