def format_mission(mission: Mission, context_for_hop: bool = False) -> str:
    """
    Format a mission object into a readable string.
    
    Args:
        mission: Mission object
        context_for_hop: If True, formats a concise version for hop-specific prompts.
        
    Returns:
        Formatted string representation of mission
    """
    if context_for_hop:
        return f"""Mission Name: {mission.name}
Overall Mission Goal (for context only): {mission.goal}
Reminder: Your current task is to implement ONLY the specific hop provided to you, not the entire mission."""
    else:
        # Existing comprehensive formatting
        inputs_str = "\n".join([f"  - {asset.name} (ID: {asset.id}): {asset.description}" for asset in mission.inputs])
        outputs_str = "\n".join([f"  - {asset.name} (ID: {asset.id}): {asset.description}" for asset in mission.outputs])
        success_criteria_str = "\n".join([f"  - {sc}" for sc in mission.success_criteria])
        
        return f"""Mission Name: {mission.name}
Description: {mission.description}
Goal: {mission.goal}
Success Criteria:
{success_criteria_str}

Inputs Required by Mission:
{inputs_str}

Expected Final Outputs from Mission:
{outputs_str}""" 