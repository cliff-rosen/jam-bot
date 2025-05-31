from typing import List, Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission

def format_messages_for_openai(messages: List[Message]) -> List[Dict[str, str]]:
    """
    Convert a list of Message objects to OpenAI API format.
    
    Args:
        messages: List of Message objects with role and content
        
    Returns:
        List of dictionaries in OpenAI message format
    """
    openai_messages = []
    for msg in messages:
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
    """
    Format a list of assets into a readable string.
    
    Args:
        assets: List of asset dictionaries
        
    Returns:
        Formatted string representation of assets
    """
    if not assets:
        return "No assets available"
        
    return "\n".join([
        f"- {asset.get('name', 'Unnamed')} (ID: {asset.get('id', 'unknown')}): {asset.get('description', 'No description')}"
        for asset in assets
    ])

def format_mission(mission: Mission) -> str:
    """
    Format a mission object into a readable string.
    
    Args:
        mission: Mission object
        
    Returns:
        Formatted string representation of mission
    """
    return f"""Goal: {mission.goal}
Success Criteria:
{mission.success_criteria}

Inputs Required:
{mission.inputs}

Expected Outputs:
{mission.outputs}""" 