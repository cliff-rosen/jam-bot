from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union, Literal, Callable, Awaitable
from datetime import datetime
from enum import Enum
from .asset import AssetType, CollectionType

class ExecutionStatus(str, Enum):
    """Status of tool execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AssetFieldMapping(BaseModel):
    type: Literal["asset_field"] = "asset_field"
    state_asset: str
    path: Optional[str] = None

class LiteralMapping(BaseModel):
    type: Literal["literal"] = "literal"
    value: Any

ParameterMappingValue = Union[AssetFieldMapping, LiteralMapping]

class ToolParameter(BaseModel):
    """Parameter definition for a tool"""
    name: str
    description: str
    required: bool = True
    schema: Optional[Dict[str, Any]] = None

class ToolOutput(BaseModel):
    """Output definition for a tool"""
    name: str
    description: str
    schema: Optional[Dict[str, Any]] = None

class ToolDefinition(BaseModel):
    """Definition of a tool that can be used in a hop"""
    id: str
    name: str
    description: str
    category: str
    parameters: List[ToolParameter]
    outputs: List[ToolOutput]
    execution_handler: Optional[Callable[[Any, Dict[str, Any]], Awaitable[Dict[str, Any]]]] = None

    def validate_input_asset(self, asset_schema: Dict[str, Any]) -> List[str]:
        """Validate that an asset schema is compatible with this tool's input requirements"""
        # TODO: Implement schema validation
        return []

    def validate_output_asset(self, asset_schema: Dict[str, Any]) -> List[str]:
        """Validate that an asset schema is compatible with this tool's output requirements"""
        # TODO: Implement schema validation
        return []

# Global registry of available tools
TOOL_REGISTRY: Dict[str, ToolDefinition] = {}

class ToolStep(BaseModel):
    """Represents an atomic unit of work - a single tool execution within a hop"""
    id: str = Field(description="Unique identifier for the tool step")
    tool_id: str = Field(description="Identifier of the tool to execute")
    description: str = Field(description="Description of what this tool step accomplishes")
    
    # Asset mappings within hop state
    parameter_mapping: Dict[str, ParameterMappingValue] = Field(
        description="Maps tool parameters to hop state assets or literals."
    )
    result_mapping: Dict[str, str] = Field(
        description="Maps tool outputs to hop state assets."
    )
    
    status: ExecutionStatus = Field(default=ExecutionStatus.PENDING)
    error: Optional[str] = Field(default=None, description="Error message if the tool execution failed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    validation_errors: Optional[List[str]] = Field(default=None, description="Schema validation errors")

    @validator('created_at', 'updated_at', pre=True)
    def handle_empty_datetime(cls, v):
        """Handle empty datetime strings from LLM responses"""
        if v == "" or v is None:
            return datetime.utcnow()
        return v

    def validate_schema_compatibility(self, tool: ToolDefinition, hop_state: Dict[str, 'Asset']) -> List[str]:
        """Validate schema compatibility between tool and assets"""
        errors = []
        
        # Validate input parameters
        for param_name, mapping in self.parameter_mapping.items():
            if isinstance(mapping, AssetFieldMapping):
                asset = hop_state.get(mapping.state_asset)
                if not asset:
                    errors.append(f"Asset {mapping.state_asset} not found in hop state")
                    continue
                
                if not asset.schema:
                    errors.append(f"Asset {mapping.state_asset} has no schema defined")
                    continue
                
                param_schema = next((p for p in tool.parameters if p.name == param_name), None)
                if not param_schema:
                    errors.append(f"Parameter {param_name} not found in tool definition")
                    continue
                
                # Validate asset schema against parameter requirements
                param_errors = tool.validate_input_asset(asset.schema)
                if param_errors:
                    errors.extend([f"Parameter {param_name}: {e}" for e in param_errors])
        
        # Validate output mappings
        for output_name, asset_name in self.result_mapping.items():
            output_schema = next((o for o in tool.outputs if o.name == output_name), None)
            if not output_schema:
                errors.append(f"Output {output_name} not found in tool definition")
                continue
            
            asset = hop_state.get(asset_name)
            if not asset:
                errors.append(f"Asset {asset_name} not found in hop state")
                continue
            
            if not asset.schema:
                errors.append(f"Asset {asset_name} has no schema defined")
                continue
            
            # Validate tool output schema against asset requirements
            output_errors = tool.validate_output_asset(asset.schema)
            if output_errors:
                errors.extend([f"Output {output_name}: {e}" for e in output_errors])
        
        return errors

    async def execute(self, hop_state: Dict[str, 'Asset']) -> List[str]:
        """Execute the tool step and validate results"""
        errors = []
        
        # Get tool
        tool = TOOL_REGISTRY.get(self.tool_id)
        if not tool:
            errors.append(f"Tool {self.tool_id} not found")
            return errors
        
        if not tool.execution_handler:
            errors.append(f"No execution handler registered for tool {self.tool_id}")
            return errors
        
        # Validate schema compatibility before execution
        validation_errors = self.validate_schema_compatibility(tool, hop_state)
        if validation_errors:
            errors.extend(validation_errors)
            return errors
        
        try:
            # Execute tool
            results = await tool.execution_handler.handler(self, hop_state)
            
            # Map results back to hop state
            for output_name, asset_name in self.result_mapping.items():
                if output_name in results:
                    hop_state[asset_name] = Asset(
                        content=results[output_name],
                        schema=tool.outputs[0].schema
                    )
            
            return errors
            
        except Exception as e:
            errors.append(f"Tool execution failed: {str(e)}")
            return errors 