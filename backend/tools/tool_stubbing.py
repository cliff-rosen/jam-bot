"""
Tool Stubbing System

This module provides utilities for stubbing tool execution during testing and development.
It allows tools to return predefined responses instead of making actual external calls.
"""

import asyncio
import random
from typing import Dict, Any, Optional, Union
from datetime import datetime
import logging

from config.settings import settings
from schemas.tool import ToolDefinition, ToolSampleResponse
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionResult

logger = logging.getLogger(__name__)

class ToolStubbing:
    """Core tool stubbing functionality."""
    
    @staticmethod
    def should_stub_tool(tool_def: ToolDefinition) -> bool:
        """
        Determine if a tool should be stubbed based on global and tool-specific settings.
        
        Args:
            tool_def: Tool definition to check
            
        Returns:
            True if the tool should be stubbed, False otherwise
        """
        # Check if stubbing is globally enabled
        if not settings.TOOL_STUBBING_ENABLED:
            return False
        
        # Check if tool has stub configuration
        if not tool_def.is_stubbable():
            return False
        
        # Check stubbing mode
        if settings.TOOL_STUBBING_MODE == "none":
            return False
        elif settings.TOOL_STUBBING_MODE == "external_only":
            # Only stub tools that require external calls
            return tool_def.stub_config.requires_external_calls
        elif settings.TOOL_STUBBING_MODE == "all":
            return True
        
        return False
    
    @staticmethod
    def should_simulate_failure() -> bool:
        """Check if we should simulate a failure based on configured failure rate."""
        return random.random() < settings.TOOL_STUBBING_FAILURE_RATE
    
    @staticmethod
    async def get_stub_response(
        tool_def: ToolDefinition, 
        input_data: ToolExecutionInput,
        scenario: Optional[str] = None
    ) -> Union[Dict[str, Any], ToolExecutionResult]:
        """
        Get a stub response for the given tool and input.
        
        Args:
            tool_def: Tool definition
            input_data: Tool execution input
            scenario: Optional scenario to use (defaults to tool's default scenario)
            
        Returns:
            Stubbed tool response
            
        Raises:
            Exception: If simulating failure or no sample response is available
        """
        print("Stubbing tool execution for {tool_def.id}")
        logger.info(f"Stubbing tool execution for {tool_def.id}")
        
        # Simulate realistic delay
        if settings.TOOL_STUBBING_DELAY_MS > 0:
            delay_seconds = settings.TOOL_STUBBING_DELAY_MS / 1000.0
            # Add some randomness to the delay (±20%)
            actual_delay = delay_seconds * (0.8 + 0.4 * random.random())
            await asyncio.sleep(actual_delay)
        
        # Check if we should simulate a failure
        if ToolStubbing.should_simulate_failure():
            logger.info(f"Simulating failure for tool {tool_def.id}")
            raise Exception(f"Simulated failure for tool {tool_def.id}")
        
        # Get the sample response
        sample_response = tool_def.get_sample_response(scenario)
        if not sample_response:
            raise Exception(f"No sample response available for tool {tool_def.id}")
        
        # Check if this is an error response
        if sample_response.is_error:
            error_msg = sample_response.error_message or f"Sample error for tool {tool_def.id}"
            logger.info(f"Returning sample error response for tool {tool_def.id}: {error_msg}")
            raise Exception(error_msg)
        
        # Process the sample response to make it more realistic
        processed_outputs = ToolStubbing._process_sample_outputs(
            sample_response.outputs, 
            input_data.params,
            tool_def
        )
        
        logger.info(f"Returning stubbed response for tool {tool_def.id} with scenario '{sample_response.scenario}'")
        
        return {
            "success": True,
            "errors": [],
            "outputs": processed_outputs,
            "_stubbed": True,
            "_scenario": sample_response.scenario,
            "_timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def _process_sample_outputs(
        sample_outputs: Dict[str, Any], 
        input_params: Dict[str, Any],
        tool_def: ToolDefinition
    ) -> Dict[str, Any]:
        """
        Process sample outputs to make them more realistic based on input parameters.
        
        This method can be extended to provide more sophisticated output processing,
        such as injecting input-based values or generating dynamic data.
        """
        processed = sample_outputs.copy()
        
        # Add some dynamic elements based on input
        if "query" in input_params:
            # For search-related tools, reflect the query in results
            query = input_params["query"]
            if "emails" in processed and isinstance(processed["emails"], list):
                for email in processed["emails"]:
                    if isinstance(email, dict) and "snippet" in email:
                        # Add query terms to snippet to make it more realistic
                        email["snippet"] = f"...{query}...{email['snippet']}"
        
        if "max_results" in input_params:
            # Respect max_results parameter for list outputs
            max_results = input_params["max_results"]
            for output_name, output_value in processed.items():
                if isinstance(output_value, list) and len(output_value) > max_results:
                    processed[output_name] = output_value[:max_results]
                    if "count" in processed:
                        processed["count"] = len(processed[output_name])
        
        # Add processing timestamp
        for key, value in processed.items():
            if isinstance(value, dict) and "metadata" not in value:
                processed[key] = {
                    **value,
                    "metadata": {
                        "stubbed_at": datetime.utcnow().isoformat(),
                        "tool_id": tool_def.id
                    }
                }
        
        return processed

def create_stub_decorator(tool_id: str):
    """
    Create a decorator for tool handlers that adds stubbing capability.
    
    Args:
        tool_id: ID of the tool to stub
        
    Returns:
        Decorator function
    """
    def decorator(handler_func):
        async def wrapper(input_data: ToolExecutionInput) -> Union[Dict[str, Any], ToolExecutionResult]:
            from tools.tool_registry import get_tool_definition
            
            # Get tool definition
            tool_def = get_tool_definition(tool_id)
            if not tool_def:
                # If tool definition not found, proceed with original handler
                return await handler_func(input_data)
            
            # Check if we should stub this tool
            if ToolStubbing.should_stub_tool(tool_def):
                return await ToolStubbing.get_stub_response(tool_def, input_data)
            
            # Otherwise, execute the original handler
            return await handler_func(input_data)
        
        return wrapper
    return decorator

# Utility functions for testing
def enable_stubbing():
    """Enable tool stubbing (useful for tests)."""
    settings.TOOL_STUBBING_ENABLED = True

def disable_stubbing():
    """Disable tool stubbing (useful for tests)."""
    settings.TOOL_STUBBING_ENABLED = False

def set_stubbing_mode(mode: str):
    """Set the stubbing mode."""
    if mode not in ["all", "external_only", "none"]:
        raise ValueError(f"Invalid stubbing mode: {mode}")
    settings.TOOL_STUBBING_MODE = mode

def set_failure_rate(rate: float):
    """Set the failure simulation rate (0.0 to 1.0)."""
    if not 0.0 <= rate <= 1.0:
        raise ValueError(f"Failure rate must be between 0.0 and 1.0, got {rate}")
    settings.TOOL_STUBBING_FAILURE_RATE = rate 