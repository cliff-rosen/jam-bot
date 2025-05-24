"""
Model data for LLM providers including OpenAI and Anthropic.
This file contains comprehensive information about all available models.
"""

from typing import Dict, Any, List

# OpenAI Models
OPENAI_MODELS: Dict[str, Dict[str, Any]] = {
    # Reasoning Models (o-series)
    "o4": {
        "description": "Most powerful reasoning model for complex, multi-step tasks",
        "context_window": 128000,
        "max_output": 4096,
        "training_data": "Apr 2023",
        "features": ["vision", "json_mode", "function_calling"],
        "category": "best",
        "aliases": ["gpt-4-turbo-preview"]
    },
    "o4-mini": {
        "description": "Faster, more affordable reasoning model",
        "context_window": 8192,
        "max_output": 4096,
        "training_data": "Apr 2023",
        "features": ["function_calling"],
        "category": "high_performance",
        "aliases": ["gpt-4-mini"]
    },
    "o3": {
        "description": "Powerful reasoning model for complex tasks",
        "context_window": 8192,
        "max_output": 4096,
        "training_data": "Sep 2021",
        "features": ["function_calling"],
        "category": "best",
        "aliases": ["gpt-4"]
    },
    "o3-mini": {
        "description": "Small model alternative to o3",
        "context_window": 4096,
        "max_output": 4096,
        "training_data": "Sep 2021",
        "features": ["function_calling"],
        "category": "fast"
    },
    
    # Flagship Chat Models
    "gpt-4.1": {
        "description": "Flagship GPT model for complex tasks",
        "context_window": 128000,
        "max_output": 4096,
        "training_data": "Apr 2023",
        "features": ["vision", "json_mode", "function_calling"],
        "category": "best",
        "aliases": ["gpt-4-turbo-preview"]
    },
    "gpt-4o": {
        "description": "Fast, intelligent, flexible GPT model",
        "context_window": 128000,
        "max_output": 4096,
        "training_data": "Apr 2023",
        "features": ["vision", "json_mode", "function_calling"],
        "category": "high_performance"
    }
}

# Anthropic Models
ANTHROPIC_MODELS: Dict[str, Dict[str, Any]] = {
    # Best Models
    "claude-4-opus-20250514": {
        "description": "Best model for complex reasoning and analysis",
        "context_window": 200000,
        "max_output": 32000,
        "training_data": "Mar 2025",
        "features": ["vision", "extended_thinking", "priority_tier"],
        "category": "best",
        "aliases": ["claude-4"]
    },
    
    # High Performance Models
    "claude-4-sonnet-20250514": {
        "description": "High-performance model for general chat and analysis",
        "context_window": 200000,
        "max_output": 64000,
        "training_data": "Mar 2025",
        "features": ["vision", "extended_thinking", "priority_tier"],
        "category": "high_performance",
        "aliases": ["claude-4-sonnet"]
    },
    
    # Fast Models
    "claude-3-5-haiku-20241022": {
        "description": "Fastest and most cost-effective model for quick tasks",
        "context_window": 200000,
        "max_output": 8192,
        "training_data": "July 2024",
        "features": ["vision", "priority_tier"],
        "category": "fast",
        "aliases": ["claude-3.5-haiku"]
    }
}

# Default models for different providers
DEFAULT_MODELS = {
    "openai": "o4",
    "anthropic": "claude-4-opus-20250514"
}

# Fast models for quick responses
FAST_MODELS = {
    "openai": "o4-mini",
    "anthropic": "claude-3-5-haiku-20241022"
}

# Model categories for easy filtering
MODEL_CATEGORIES = {
    "best": [
        "claude-4-opus-20250514",
        "o4",
        "o3",
        "gpt-4.1"
    ],
    "high_performance": [
        "claude-4-sonnet-20250514",
        "o4-mini",
        "gpt-4o",
        "gpt-4o-audio-preview",
        "chatgpt-4o-latest"
    ],
    "fast": [
        "o3-mini",
        "claude-3-5-haiku-20241022"
    ],
    "legacy": [
        "o1",
        "o1-mini",
        "o1-pro"
    ]
}

# Create a mapping of aliases to canonical model names
MODEL_ALIASES: Dict[str, str] = {}
for model_name, model_data in OPENAI_MODELS.items():
    if "aliases" in model_data:
        for alias in model_data["aliases"]:
            MODEL_ALIASES[alias] = model_name

for model_name, model_data in ANTHROPIC_MODELS.items():
    if "aliases" in model_data:
        for alias in model_data["aliases"]:
            MODEL_ALIASES[alias] = model_name

__all__ = [
    'OPENAI_MODELS',
    'ANTHROPIC_MODELS',
    'DEFAULT_MODELS',
    'FAST_MODELS',
    'MODEL_CATEGORIES',
    'MODEL_ALIASES'
] 