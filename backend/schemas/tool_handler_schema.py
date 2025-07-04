"""Schema definitions and base wrapper for backend tool handlers.

Placing these models in the `schemas` package keeps *all* shared/serialisable
objects in a single place, while the `tool_handlers` package remains dedicated
purely to implementation code.
"""

from __future__ import annotations

from typing import Awaitable, Callable, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

__all__ = [
    "ToolExecutionInput",
    "ToolExecutionResult",
    "ToolExecutionHandler",
]


class ToolExecutionInput(BaseModel):
    """Input payload delivered to every tool handler."""

    params: Dict[str, Any] = Field(default_factory=dict)
    resource_configs: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Configuration for each required resource, keyed by resource ID"
    )
    step_id: Optional[str] = None


class ToolExecutionResult(BaseModel):
    """Result returned by a tool handler with properly typed outputs."""
    
    outputs: Dict[str, Any] = Field(
        description="Maps output parameter names to their values, preserving canonical types"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional metadata about the execution"
    )


class ToolExecutionHandler(BaseModel):
    """Metadata + async callable that performs the work."""

    handler: Callable[[ToolExecutionInput], Awaitable[Union[Dict[str, Any], ToolExecutionResult]]]
    description: str 