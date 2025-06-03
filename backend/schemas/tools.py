from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum
import json
import os


class ToolType(str, Enum):
    """Types of available tools based on tools.json"""
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


class ToolDefinition(BaseModel):
    """Complete definition of a tool from tools.json"""
    name: str = Field(description="Name of the tool")
    description: str = Field(description="Description of what the tool does")
    parameters: Dict[str, Any] = Field(description="JSON schema for tool parameters")
    
    @classmethod
    def load_from_json(cls, file_path: str = "_specs/tools.json") -> Dict[str, 'ToolDefinition']:
        """Load tool definitions from tools.json"""
        try:
            with open(file_path, 'r') as f:
                tools_data = json.load(f)
            
            tool_registry = {}
            for tool_def in tools_data.get("tool_definitions", []):
                tool_registry[tool_def["name"]] = cls(
                    name=tool_def["name"],
                    description=tool_def["description"],
                    parameters=tool_def["parameters"]
                )
            
            return tool_registry
        except FileNotFoundError:
            # Fallback if tools.json is not found
            return {}


# Load tool registry from tools.json
try:
    TOOL_REGISTRY = ToolDefinition.load_from_json()
except Exception as e:
    print(f"Warning: Could not load tools.json: {e}")
    TOOL_REGISTRY = {}


def get_tool_definition(tool_name: str) -> Optional[ToolDefinition]:
    """Get the definition for a specific tool"""
    return TOOL_REGISTRY.get(tool_name)


def get_available_tools() -> List[str]:
    """Get list of all available tool names"""
    return list(TOOL_REGISTRY.keys())


def get_tools_by_category() -> Dict[str, List[str]]:
    """Categorize tools by their primary function"""
    categories = {
        "data_retrieval": ["search_data_source"],
        "data_processing": ["extract_from_record", "enrich_records", "transform_records"],
        "data_analysis": ["group_by_reduce", "filter_records"],
        "data_storage": ["store_in_database"],
        "data_validation": ["validate_records"]
    }
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


# Example workflows using the tools
EXAMPLE_WORKFLOWS = {
    "gmail_analysis": {
        "description": "Analyze Gmail emails by time periods",
        "steps": [
            {
                "tool": "search_data_source",
                "purpose": "Retrieve emails from Gmail folder",
                "key_parameters": ["source_type", "query_criteria", "date_range"]
            },
            {
                "tool": "extract_from_record", 
                "purpose": "Extract key information from each email",
                "key_parameters": ["extraction_schema", "extraction_method"]
            },
            {
                "tool": "group_by_reduce",
                "purpose": "Group emails by day and summarize",
                "key_parameters": ["group_by_fields", "aggregation_functions"]
            },
            {
                "tool": "group_by_reduce",
                "purpose": "Group daily summaries by week", 
                "key_parameters": ["group_by_fields", "aggregation_functions"]
            },
            {
                "tool": "transform_records",
                "purpose": "Format final report",
                "key_parameters": ["transformations", "output_format"]
            }
        ]
    }
}


def format_tool_descriptions_for_mission_design() -> str:
    """Format tool descriptions optimized for mission design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tools.json could not be loaded"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        
        # Format key parameters from JSON schema
        if "properties" in tool_def.parameters:
            key_params = []
            for param_name, param_schema in tool_def.parameters["properties"].items():
                if param_name in tool_def.parameters.get("required", []):
                    param_type = param_schema.get("type", "unknown")
                    if "enum" in param_schema:
                        key_params.append(f"{param_name} (options: {', '.join(param_schema['enum'])})")
                    else:
                        key_params.append(f"{param_name} ({param_type})")
            
            if key_params:
                desc += f"**Key Parameters**: {', '.join(key_params)}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_hop_design() -> str:
    """Format tool descriptions optimized for hop design context"""
    if not TOOL_REGISTRY:
        return "No tools available - tools.json could not be loaded"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"**Purpose**: {tool_def.description}\n"
        
        # Format key capabilities and parameters
        if "properties" in tool_def.parameters:
            key_info = []
            
            # Special handling for different tools
            if tool_name == "search_data_source":
                source_types = tool_def.parameters["properties"].get("source_type", {}).get("enum", [])
                if source_types:
                    key_info.append(f"**Sources**: {', '.join(source_types)}")
            
            elif tool_name == "extract_from_record":
                methods = tool_def.parameters["properties"].get("extraction_method", {}).get("enum", [])
                if methods:
                    key_info.append(f"**Methods**: {', '.join(methods)}")
            
            elif tool_name == "group_by_reduce":
                key_info.append("**Capabilities**: Group by date/field expressions, aggregate functions (count, avg, sum, collect)")
            
            elif tool_name == "store_in_database":
                storage_types = tool_def.parameters["properties"].get("storage_type", {}).get("enum", [])
                if storage_types:
                    key_info.append(f"**Storage Types**: {', '.join(storage_types)}")
            
            if key_info:
                desc += "\n".join(key_info) + "\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions)


def format_tool_descriptions_for_implementation() -> str:
    """Format tool descriptions optimized for hop implementation context"""
    if not TOOL_REGISTRY:
        return "No tools available - tools.json could not be loaded"
    
    descriptions = []
    for tool_name, tool_def in TOOL_REGISTRY.items():
        desc = f"### {tool_name}\n"
        desc += f"Description: {tool_def.description}\n"
        
        # Format parameters from JSON schema
        if "properties" in tool_def.parameters:
            desc += "Parameters:\n"
            for param_name, param_schema in tool_def.parameters["properties"].items():
                param_type = param_schema.get("type", "unknown")
                param_desc = param_schema.get("description", "No description")
                is_required = param_name in tool_def.parameters.get("required", [])
                
                desc += f"  - {param_name} ({param_type}): {param_desc}"
                if not is_required:
                    default_val = param_schema.get("default", "None")
                    desc += f" [Optional, default: {default_val}]"
                desc += "\n"
                
                # Add enum values if present
                if "enum" in param_schema:
                    desc += f"    Options: {', '.join(param_schema['enum'])}\n"
        
        desc += "\n"
        descriptions.append(desc)
    
    return "\n".join(descriptions) 