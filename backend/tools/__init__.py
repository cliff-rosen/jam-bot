# New package for tool handlers and registry

from schemas.tool_handler_schema import (
    ToolExecutionInput,
    ToolExecutionResult,
    ToolExecutionHandler,
)

# Import individual tool handler modules so their registration side-effects run
# (e.g. they call register_tool_handler when imported).
# Add additional handler modules here as they are implemented.
from . import email_handlers  # noqa: F401

# Refresh tool registry after all handlers are registered
from .tool_registry import refresh_tool_registry
refresh_tool_registry()

__all__ = [
    "ToolExecutionInput",
    "ToolExecutionResult",
    "ToolExecutionHandler",
] 