"""
Configuration for LLM models and their capabilities
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class ModelCapabilities(BaseModel):
    """Capabilities and parameters supported by a model"""
    supports_reasoning_effort: bool = False
    reasoning_effort_levels: Optional[List[str]] = None
    max_tokens: Optional[int] = None
    supports_vision: bool = False
    supports_function_calling: bool = True
    supports_structured_outputs: bool = True


# Model configurations with their capabilities
MODEL_CONFIGS: Dict[str, ModelCapabilities] = {
    # GPT-5 Series - Latest generation with advanced reasoning support
    "gpt-5": ModelCapabilities(
        supports_reasoning_effort=True,
        reasoning_effort_levels=["low", "medium", "high"],
        max_tokens=128000,
        supports_vision=True,
        supports_function_calling=True,
        supports_structured_outputs=True
    ),
    "gpt-5-mini": ModelCapabilities(
        supports_reasoning_effort=True,
        reasoning_effort_levels=["low", "medium"],
        max_tokens=64000,
        supports_vision=True,
        supports_function_calling=True,
        supports_structured_outputs=True
    ),
    "gpt-5-nano": ModelCapabilities(
        supports_reasoning_effort=True,
        reasoning_effort_levels=["low", "medium"],
        max_tokens=32000,
        supports_vision=False,
        supports_function_calling=True,
        supports_structured_outputs=True
    ),
    
    # GPT-4.1 Series - Enhanced GPT-4
    "gpt-4.1": ModelCapabilities(
        supports_reasoning_effort=False,  # GPT-4.1 doesn't support reasoning effort
        max_tokens=128000,
        supports_vision=True,
        supports_function_calling=True,
        supports_structured_outputs=True
    ),
}


def get_model_capabilities(model_name: str) -> ModelCapabilities:
    """
    Get the capabilities for a specific model.
    
    Args:
        model_name: The name of the model
        
    Returns:
        ModelCapabilities object for the model
        
    Raises:
        ValueError: If the model is not found in the configuration
    """
    if model_name not in MODEL_CONFIGS:
        raise ValueError(f"Model {model_name} not found in configuration. Available models: {list(MODEL_CONFIGS.keys())}")
    return MODEL_CONFIGS[model_name]


def supports_reasoning_effort(model_name: str) -> bool:
    """
    Check if a model supports the reasoning effort parameter.
    
    Args:
        model_name: The name of the model
        
    Returns:
        True if the model supports reasoning effort, False otherwise
    """
    try:
        capabilities = get_model_capabilities(model_name)
        return capabilities.supports_reasoning_effort
    except ValueError:
        return False


def get_valid_reasoning_efforts(model_name: str) -> Optional[List[str]]:
    """
    Get the valid reasoning effort levels for a model.
    
    Args:
        model_name: The name of the model
        
    Returns:
        List of valid reasoning effort levels, or None if not supported
    """
    try:
        capabilities = get_model_capabilities(model_name)
        if capabilities.supports_reasoning_effort:
            return capabilities.reasoning_effort_levels
        return None
    except ValueError:
        return None