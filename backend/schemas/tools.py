from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum
import json
import os


class ToolType(str, Enum):
    """Types of available tools based on actual implementations"""
    SEARCH_DATA_SOURCE = "search_data_source"
    EXTRACT_FROM_RECORD = "extract_from_record"
    ENRICH_RECORDS = "enrich_records"
    STORE_IN_DATABASE = "store_in_database"
    GROUP_BY_REDUCE = "group_by_reduce"
    FILTER_RECORDS = "filter_records"
    TRANSFORM_RECORDS = "transform_records"
    VALIDATE_RECORDS = "validate_records"


class SourceType(str, Enum):
    """Supported data source types"""
    GMAIL = "gmail"
    GOOGLE_DRIVE = "google_drive"
    DATABASE = "database"
    API = "api"
    FILE = "file"
    SLACK = "slack"
    NOTION = "notion"


class ExtractionMethod(str, Enum):
    """Methods for record extraction"""
    LLM_PROMPT = "llm_prompt"
    REGEX = "regex"
    JSON_PATH = "json_path"
    API_CALL = "api_call"
    CUSTOM_FUNCTION = "custom_function"


class ComputationType(str, Enum):
    """Types of computation for enrichment"""
    TIMESTAMP = "timestamp"
    HASH = "hash"
    UUID = "uuid"
    COMPUTED_FIELD = "computed_field"
    LOOKUP = "lookup"
    CONDITIONAL = "conditional"


class StorageType(str, Enum):
    """Types of storage systems"""
    OBJECT_DB = "object_db"
    RELATIONAL_DB = "relational_db"
    FILE = "file"
    MEMORY = "memory"
    CLOUD_STORAGE = "cloud_storage"


class FilterOperator(str, Enum):
    """Filter operators"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    IN = "in"
    NOT_IN = "not_in"
    REGEX = "regex"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"


class TransformationType(str, Enum):
    """Types of record transformations"""
    RENAME_FIELD = "rename_field"
    COMPUTE_FIELD = "compute_field"
    FORMAT_FIELD = "format_field"
    SPLIT_FIELD = "split_field"
    MERGE_FIELDS = "merge_fields"
    CONVERT_TYPE = "convert_type"


class OutputFormat(str, Enum):
    """Output format options"""
    PRESERVE = "preserve"
    FLATTEN = "flatten"
    NORMALIZE = "normalize"
    PIVOT = "pivot"


class ValidationMode(str, Enum):
    """Validation modes"""
    STRICT = "strict"
    LENIENT = "lenient"
    REPORT_ONLY = "report_only"


class ToolOutputSchema(BaseModel):
    """Defines the output schema for a tool"""
    name: str = Field(description="Output field name")
    type: str = Field(description="Data type (string, number, boolean, object, array)")
    description: str = Field(description="Description of what this output contains")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")
    required: bool = Field(default=True, description="Whether this output is always present")
    example: Optional[Any] = Field(default=None, description="Example value")


class ToolDefinition(BaseModel):
    """Complete definition of a tool with proper input/output schemas"""
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of what the tool does")
    input_schema: Dict[str, Any] = Field(description="JSON schema for tool input parameters")
    output_schema: List[ToolOutputSchema] = Field(description="Structured output schema definition")
    category: str = Field(description="Category of tool (data_retrieval, processing, analysis, etc.)")
    examples: Optional[List[Dict[str, Any]]] = Field(default=None, description="Usage examples")
    
    @classmethod
    def create_from_implementation(cls, tool_class) -> 'ToolDefinition':
        """Create tool definition from actual tool implementation"""
        # This will be implemented by actual tool classes
        # Each tool class should define get_tool_definition() method
        if hasattr(tool_class, 'get_tool_definition'):
            return tool_class.get_tool_definition()
        else:
            raise NotImplementedError(f"Tool {tool_class.__name__} must implement get_tool_definition()")


# Tool registry - will be populated by actual tool implementations
TOOL_REGISTRY: Dict[str, ToolDefinition] = {}


def register_tool(tool_definition: ToolDefinition) -> None:
    """Register a tool in the global registry"""
    TOOL_REGISTRY[tool_definition.name] = tool_definition


def get_tool_definition(tool_name: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool"""
    return TOOL_REGISTRY.get(tool_name)


def get_available_tools() -> List[str]:
    """Get list of all available tool names"""
    return list(TOOL_REGISTRY.keys())


def get_tools_by_category() -> Dict[str, List[str]]:
    """Categorize tools by their primary function"""
    categories = {}
    for tool_name, tool_def in TOOL_REGISTRY.items():
        category = tool_def.category
        if category not in categories:
            categories[category] = []
        categories[category].append(tool_name)
    return categories


# Common tool parameter patterns for hop implementer
COMMON_PARAMETER_PATTERNS = {
    "asset_input": {
        "type": "string",
        "description": "Name of the input asset containing data to process"
    },
    "asset_output": {
        "type": "string", 
        "description": "Name for the output asset"
    },
    "date_range": {
        "type": "object",
        "properties": {
            "start_date": {"type": "string", "format": "date"},
            "end_date": {"type": "string", "format": "date"}
        }
    }
}


def format_tool_descriptions_for_mission_design() -> str:
    """Format tool descriptions optimized for mission design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool implementations not loaded yet"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Show key input capabilities
        if "properties" in tool_def.input_schema:
            key_inputs = []
            for param_name, param_schema in tool_def.input_schema["properties"].items():
                if param_name in tool_def.input_schema.get("required", []):
                    if "enum" in param_schema:
                        key_inputs.append(f"{param_name} (options: {', '.join(param_schema['enum'])})")
            if key_inputs:
                desc += f"**Key Capabilities**: {', '.join(key_inputs)}\n"
        
        # Show what it produces
        if tool_def.output_schema:
            outputs = [output.name for output in tool_def.output_schema if output.required]
            if outputs:
                desc += f"**Produces**: {', '.join(outputs)}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_hop_design() -> str:
    """Format tool descriptions optimized for hop design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool implementations not loaded yet"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        desc += f"**Category**: {tool_def.category}\n"
        
        # Show input/output flow for chaining
        if tool_def.output_schema:
            outputs = [f"{out.name} ({out.type})" for out in tool_def.output_schema if out.required]
            if outputs:
                desc += f"**Outputs**: {', '.join(outputs)}\n"
        
        # Show examples if available
        if tool_def.examples:
            desc += f"**Usage Pattern**: {tool_def.examples[0].get('description', 'See documentation')}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_implementation() -> str:
    """Format tool descriptions optimized for hop implementation context"""
    if not TOOL_REGISTRY:
        return "No tools available - tool implementations not loaded yet"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"Description: {tool_def.description}\n"
        
        # Detailed input schema
        desc += "Input Parameters:\n"
        if "properties" in tool_def.input_schema:
            for param_name, param_schema in tool_def.input_schema["properties"].items():
                param_type = param_schema.get("type", "unknown")
                param_desc = param_schema.get("description", "No description")
                is_required = param_name in tool_def.input_schema.get("required", [])
                
                desc += f"  - {param_name} ({param_type}): {param_desc}"
                if not is_required:
                    default_val = param_schema.get("default", "None")
                    desc += f" [Optional, default: {default_val}]"
                desc += "\n"
                
                if "enum" in param_schema:
                    desc += f"    Options: {', '.join(param_schema['enum'])}\n"
        
        # Detailed output schema
        desc += "Outputs:\n"
        for output in tool_def.output_schema:
            desc += f"  - {output.name} ({output.type}): {output.description}"
            if not output.required:
                desc += " [Optional]"
            desc += "\n"
            if output.example:
                desc += f"    Example: {output.example}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


# TODO: Replace this placeholder with actual tool loading
# This should be called during app startup to load real tools
def load_tool_implementations():
    """Load actual tool implementations into the registry"""
    # This will be implemented to discover and load real tools
    # For now, we'll have an empty registry until tools are implemented
    pass


# Example workflows - these should come from real tool combinations
EXAMPLE_WORKFLOWS = {
    "gmail_analysis": {
        "description": "Analyze Gmail emails by time periods",
        "status": "pending_tool_implementations",
        "planned_steps": [
            "search_data_source(gmail) → email collection",
            "extract_from_record(llm_prompt) → content analysis", 
            "group_by_reduce(by date) → time-based aggregation",
            "transform_records → formatted report"
        ]
    }
} 