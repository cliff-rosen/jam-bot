from typing import List, Dict, Any, Union
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission
from .prompt_context_mapper import PromptContextMapper, PromptContextType, PromptContext, prompt_context_mapper

def format_messages_for_openai(messages: List[Any]) -> List[Dict[str, str]]:
    """
    Convert a list of Message objects to OpenAI API format.
    
    Args:
        messages: List of Message objects with role and content
        
    Returns:
        List of dictionaries in OpenAI message format
    """
    openai_messages = []
    for msg in messages:
        if isinstance(msg, (HumanMessage, AIMessage, SystemMessage)):
            # Handle LangChain message types
            if isinstance(msg, HumanMessage):
                openai_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                openai_messages.append({"role": "assistant", "content": msg.content})
            elif isinstance(msg, SystemMessage):
                openai_messages.append({"role": "system", "content": msg.content})
        else:
            # Handle our own Message type
            if msg.role == MessageRole.USER:
                openai_messages.append({"role": "user", "content": msg.content})
            elif msg.role == MessageRole.ASSISTANT:
                openai_messages.append({"role": "assistant", "content": msg.content})
            elif msg.role == MessageRole.SYSTEM:
                openai_messages.append({"role": "system", "content": msg.content})
    
    return openai_messages

def format_langchain_messages(messages: List[Message]) -> List[Any]:
    """
    Convert a list of Message objects to LangChain message format.
    
    Args:
        messages: List of Message objects with role and content
        
    Returns:
        List of LangChain message objects (HumanMessage, AIMessage, SystemMessage)
    """
    langchain_messages = []
    for msg in messages:
        if msg.role == MessageRole.USER:
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == MessageRole.ASSISTANT:
            langchain_messages.append(AIMessage(content=msg.content))
        elif msg.role == MessageRole.SYSTEM:
            langchain_messages.append(SystemMessage(content=msg.content))
    
    return langchain_messages

def format_assets(assets: List[Dict[str, Any]]) -> str:
    """Format a list of assets into a string representation"""
    if not assets:
        return "No assets available"
    
    return "\n".join([
        f"- {asset.name if hasattr(asset, 'name') else asset.get('name', 'Unnamed')} "
        f"(ID: {asset.id if hasattr(asset, 'id') else asset.get('id', 'unknown')}): "
        f"{asset.description if hasattr(asset, 'description') else asset.get('description', 'No description')}"
        for asset in assets
    ])

def format_mission(mission: Union[Dict[str, Any], Any], context_for_hop: bool = False) -> str:
    """
    Format a mission object into a readable string.
    
    Args:
        mission: Mission object or dictionary (can be Mission model or dict)
        context_for_hop: If True, formats a concise version for hop-specific prompts.
        
    Returns:
        Formatted string representation of mission
    """
    # Convert Pydantic model to dict if needed
    if hasattr(mission, 'model_dump'):
        mission = mission.model_dump()
    elif hasattr(mission, 'dict'):
        mission = mission.dict()

    if context_for_hop:
        return f"""Mission Name: {mission["name"]}
Overall Mission Goal (for context only): {mission["goal"]}
Reminder: Your current task is to implement ONLY the specific hop provided to you, not the entire mission."""
    else:
        # Existing comprehensive formatting
        inputs_str = "\n".join([f"  - {asset['name']} (ID: {asset['id']}): {asset['description']}" for asset in mission["inputs"]])
        outputs_str = "\n".join([f"  - {asset['name']} (ID: {asset['id']}): {asset['description']}" for asset in mission["outputs"]])
        success_criteria_str = "\n".join([f"  - {sc}" for sc in mission["success_criteria"]])
        
        return f"""Mission Name: {mission["name"]}
Description: {mission["description"]}
Goal: {mission["goal"]}
Success Criteria:
{success_criteria_str}

Inputs Required by Mission:
{inputs_str}

Expected Final Outputs from Mission:
{outputs_str}"""

# Tool description formatting functions moved from tool_registry.py

def format_tool_descriptions_for_mission_design() -> str:
    """Return a human readable list of tools (mission design view)."""
    from tools.tool_registry import TOOL_REGISTRY
    
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."

    descriptions: List[str] = []
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"

        key_inputs = [param.name for param in tool_def.parameters if param.required]
        if key_inputs:
            desc += f"**Key Capabilities**: {', '.join(key_inputs)}\n"

        outputs = [output.name for output in tool_def.outputs]
        if outputs:
            desc += f"**Produces**: {', '.join(outputs)}\n"

        desc += "\n"
        descriptions.append(desc)

    return "\n".join(descriptions)


def format_tool_descriptions_for_hop_design() -> str:
    """Return a human readable list of tools (hop design view)."""
    from tools.tool_registry import TOOL_REGISTRY
    
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."

    descriptions: List[str] = []
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"

        outputs_with_types = [f"{o.name} ({o.schema_definition.type if o.schema_definition else 'object'})" for o in tool_def.outputs]
        if outputs_with_types:
            desc += f"**Outputs**: {', '.join(outputs_with_types)}\n"

        desc += "\n"
        descriptions.append(desc)

    return "\n".join(descriptions)


def format_tool_descriptions_for_implementation() -> str:
    """Return a human readable list of tools (implementation view)."""
    from tools.tool_registry import TOOL_REGISTRY
    
    if not TOOL_REGISTRY:
        return "No tools available - tool registry not loaded. Call refresh_tool_registry() first."

    descriptions: List[str] = []
    for tool_id, tool_def in TOOL_REGISTRY.items():
        desc = f"### Tool Name: {tool_def.name} (ID: {tool_def.id})\n"
        desc += f"Description: {tool_def.description}\n"
        desc += "Input Parameters:\n"
        for param in tool_def.parameters:
            param_type = param.schema_definition.type if param.schema_definition else "object"
            line = f"  - {param.name} ({param_type}): {param.description}"
            if not param.required:
                line += " [Optional]"
            desc += line + "\n"

        desc += "Outputs:\n"
        for output in tool_def.outputs:
            output_type = output.schema_definition.type if output.schema_definition else "object"
            desc += f"  - {output.name} ({output_type}): {output.description}\n"

        desc += "\n"
        descriptions.append(desc)

    return "\n".join(descriptions)

# New functions that integrate with the prompt context mapper

def create_prompt_context(
    context_type: PromptContextType,
    mission: Mission,
    current_hop=None,
    additional_assets=None,
    **kwargs
) -> PromptContext:
    """
    Create a comprehensive prompt context using the new mapper system.
    
    Args:
        context_type: Type of prompt context needed
        mission: Current mission state
        current_hop: Current hop (if applicable)
        additional_assets: Additional assets to include
        **kwargs: Additional context-specific parameters
        
    Returns:
        Structured prompt context
    """
    return prompt_context_mapper.create_context(
        context_type=context_type,
        mission=mission,
        current_hop=current_hop,
        additional_assets=additional_assets,
        **kwargs
    )

def format_context_for_prompt(
    context: PromptContext,
    include_categories: bool = False,
    include_metadata: bool = False
) -> Dict[str, str]:
    """
    Format a prompt context for use in prompt templates.
    
    Args:
        context: The prompt context to format
        include_categories: Whether to include asset categories
        include_metadata: Whether to include metadata
        
    Returns:
        Dictionary with formatted strings for prompt variables
    """
    # Get basic string format
    formatted = prompt_context_mapper.to_string_format(context)
    
    # Add categorized assets if requested
    if include_categories:
        formatted["asset_categories"] = _format_asset_categories(context.asset_categories)
    
    # Add metadata if requested
    if include_metadata:
        formatted["metadata"] = _format_metadata(context.metadata)
    
    return formatted

def _format_asset_categories(asset_categories: Dict[str, List[Dict[str, Any]]]) -> str:
    """Format asset categories for prompt inclusion"""
    if not asset_categories:
        return "No asset categories available"
    
    category_strings = []
    
    for category_name, assets in asset_categories.items():
        if assets:
            asset_strings = [f"  - {asset['name']} ({asset['type']}): {asset['description']}" for asset in assets]
            category_strings.append(f"{category_name.upper()}:\n" + "\n".join(asset_strings))
    
    return "\n\n".join(category_strings) if category_strings else "No categorized assets available"

def _format_metadata(metadata: Dict[str, Any]) -> str:
    """Format metadata for prompt inclusion"""
    if not metadata:
        return "No metadata available"
    
    metadata_strings = []
    for key, value in metadata.items():
        if isinstance(value, float):
            metadata_strings.append(f"{key}: {value:.1%}")
        else:
            metadata_strings.append(f"{key}: {value}")
    
    return "\n".join(metadata_strings)

# Legacy compatibility functions that use the new system internally

def format_mission_with_context(
    mission: Mission,
    context_type: str = "mission_definition",
    current_hop=None,
    **kwargs
) -> Dict[str, str]:
    """
    Legacy function that provides backward compatibility while using the new system.
    
    Args:
        mission: Current mission state
        context_type: Type of context (string version)
        current_hop: Current hop (if applicable)
        **kwargs: Additional parameters
        
    Returns:
        Dictionary with formatted strings for prompt variables
    """
    # Map string context type to enum
    context_type_map = {
        "mission_definition": PromptContextType.MISSION_DEFINITION,
        "hop_design": PromptContextType.HOP_DESIGN,
        "hop_implementation": PromptContextType.HOP_IMPLEMENTATION,
        "tool_execution": PromptContextType.TOOL_EXECUTION,
        "mission_review": PromptContextType.MISSION_REVIEW,
    }
    
    enum_context_type = context_type_map.get(context_type, PromptContextType.MISSION_DEFINITION)
    
    # Create context using new system
    context = create_prompt_context(
        context_type=enum_context_type,
        mission=mission,
        current_hop=current_hop,
        **kwargs
    )
    
    # Return string format for backward compatibility
    return prompt_context_mapper.to_string_format(context) 