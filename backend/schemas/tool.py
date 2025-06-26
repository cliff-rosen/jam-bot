"""
Tool Schema Definitions

This module contains all Pydantic models and related utilities for defining
and managing Tools. Tools are the functional units that perform actions
within a hop.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from .base import SchemaEntity
from .resource import Resource
from .tool_handler_schema import ToolExecutionHandler

# --- Core Tool Models ---

class ToolParameter(SchemaEntity):
    """
    Defines an input parameter for a tool. It extends SchemaEntity and adds
    a 'required' flag.
    """
    required: bool = Field(default=True)

class ToolOutput(SchemaEntity):
    """
    Defines an output field for a tool. It extends SchemaEntity and adds
    a 'required' flag.
    """
    required: bool = Field(default=True)

class ToolSampleResponse(BaseModel):
    """
    Defines a sample response for tool stubbing during testing.
    """
    scenario: str = Field(description="Description of the scenario this response represents")
    outputs: Dict[str, Any] = Field(description="Sample output data matching the tool's output schema")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata for the sample response")
    is_error: bool = Field(default=False, description="Whether this represents an error response")
    error_message: Optional[str] = Field(default=None, description="Error message if this is an error response")

class ToolStubConfig(BaseModel):
    """
    Configuration for tool stubbing behavior.
    """
    enabled: bool = Field(default=True, description="Whether stubbing is enabled for this tool")
    default_scenario: str = Field(default="success", description="Default scenario to use when stubbing")
    requires_external_calls: bool = Field(default=True, description="Whether this tool makes external API calls")
    sample_responses: List[ToolSampleResponse] = Field(default_factory=list, description="Available sample responses")

class ToolDefinition(BaseModel):
    """
    Represents the complete definition of a tool, including its parameters,
    outputs, and dependencies on external resources.
    """
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    resource_dependencies: List[Resource] = Field(default_factory=list)
    stub_config: Optional[ToolStubConfig] = Field(default=None, description="Configuration for tool stubbing")
    
    # The execution_handler is not serialized and is attached at runtime.
    execution_handler: Optional[ToolExecutionHandler] = Field(default=None, exclude=True)

    # --- Utility Methods ---

    def requires_resources(self) -> bool:
        """Checks if the tool has any resource dependencies."""
        return len(self.resource_dependencies) > 0
    
    def get_resource_ids(self) -> List[str]:
        """Returns a list of IDs for all resources this tool depends on."""
        return [r.id for r in self.resource_dependencies]
    
    def get_resource_config(self, resource_id: str) -> Optional[Resource]:
        """Retrieves the definition for a specific resource dependency."""
        return next((r for r in self.resource_dependencies if r.id == resource_id), None)
    
    def get_sample_response(self, scenario: str = None) -> Optional[ToolSampleResponse]:
        """Get a sample response for the given scenario, or default scenario if not specified."""
        if not self.stub_config or not self.stub_config.sample_responses:
            return None
        
        target_scenario = scenario or self.stub_config.default_scenario
        
        # Find exact match first
        for response in self.stub_config.sample_responses:
            if response.scenario == target_scenario:
                return response
        
        # Fallback to first available response
        return self.stub_config.sample_responses[0] if self.stub_config.sample_responses else None
    
    def is_stubbable(self) -> bool:
        """Check if this tool can be stubbed."""
        return (self.stub_config is not None and 
                self.stub_config.enabled and 
                len(self.stub_config.sample_responses) > 0) 