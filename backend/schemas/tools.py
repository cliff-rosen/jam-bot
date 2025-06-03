from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from enum import Enum


class ToolType(str, Enum):
    """Types of available tools"""
    GMAIL_SEARCH = "gmail_search"
    EMAIL_EXTRACTION = "email_extraction"
    DATA_STORE_UPDATE = "data_store_update"
    DATA_STORE_SUMMARIZE = "data_store_summarize"


class ToolParameter(BaseModel):
    """Definition of a tool parameter"""
    name: str = Field(description="Parameter name")
    type: str = Field(description="Parameter type (string, number, boolean, object, array)")
    description: str = Field(description="Description of the parameter")
    required: bool = Field(default=True, description="Whether this parameter is required")
    default: Optional[Any] = Field(default=None, description="Default value if not required")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")


class ToolOutput(BaseModel):
    """Definition of a tool output"""
    name: str = Field(description="Output field name")
    type: str = Field(description="Output type")
    description: str = Field(description="Description of the output")
    schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON schema for complex types")


class ToolDefinition(BaseModel):
    """Complete definition of a tool"""
    name: ToolType = Field(description="Name of the tool")
    description: str = Field(description="Description of what the tool does")
    parameters: List[ToolParameter] = Field(description="List of input parameters")
    outputs: List[ToolOutput] = Field(description="List of output fields")
    example_usage: Optional[Dict[str, Any]] = Field(default=None, description="Example of tool usage")


# Gmail Search Tool
GMAIL_SEARCH_TOOL = ToolDefinition(
    name=ToolType.GMAIL_SEARCH,
    description="Search Gmail for emails matching specified criteria",
    parameters=[
        ToolParameter(
            name="query",
            type="string",
            description="Gmail search query (e.g., 'from:sender@example.com subject:Important')",
            required=True
        ),
        ToolParameter(
            name="max_results",
            type="number",
            description="Maximum number of emails to return",
            required=False,
            default=50
        ),
        ToolParameter(
            name="include_body",
            type="boolean",
            description="Whether to include email body in results",
            required=False,
            default=True
        )
    ],
    outputs=[
        ToolOutput(
            name="emails",
            type="array",
            description="List of emails matching the search criteria",
            schema={
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "thread_id": {"type": "string"},
                        "from": {"type": "string"},
                        "to": {"type": "array", "items": {"type": "string"}},
                        "subject": {"type": "string"},
                        "date": {"type": "string"},
                        "body": {"type": "string"},
                        "labels": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        ),
        ToolOutput(
            name="total_count",
            type="number",
            description="Total number of emails found"
        )
    ],
    example_usage={
        "description": "Example showing how to map from assets to tool parameters",
        "parameter_mapping": {
            "query": {
                "type": "asset_field",
                "asset_id": "search_criteria_asset",
                "field_path": "content.email_query"
            },
            "max_results": {
                "type": "literal",
                "value": 100
            }
        },
        "output_mapping": {
            "emails": "email_list",
            "total_count": "metadata.total_emails"
        }
    }
)

# Email Extraction Tool
EMAIL_EXTRACTION_TOOL = ToolDefinition(
    name=ToolType.EMAIL_EXTRACTION,
    description="Extract structured information from a single email",
    parameters=[
        ToolParameter(
            name="email",
            type="object",
            description="The email object to extract information from",
            required=True,
            schema={
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                    "from": {"type": "string"},
                    "date": {"type": "string"}
                }
            }
        ),
        ToolParameter(
            name="extraction_schema",
            type="object",
            description="Schema defining what information to extract",
            required=True,
            schema={
                "type": "object",
                "additionalProperties": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string"},
                        "description": {"type": "string"},
                        "required": {"type": "boolean"}
                    }
                }
            }
        )
    ],
    outputs=[
        ToolOutput(
            name="extracted_data",
            type="object",
            description="Extracted information according to the provided schema",
            schema={"type": "object", "additionalProperties": True}
        ),
        ToolOutput(
            name="extraction_confidence",
            type="number",
            description="Confidence score of the extraction (0-1)"
        )
    ]
)

# Data Store Update Tool
DATA_STORE_UPDATE_TOOL = ToolDefinition(
    name=ToolType.DATA_STORE_UPDATE,
    description="Add or update data in a persistent data store",
    parameters=[
        ToolParameter(
            name="store_name",
            type="string",
            description="Name of the data store to update",
            required=True
        ),
        ToolParameter(
            name="key",
            type="string",
            description="Key to identify the record",
            required=True
        ),
        ToolParameter(
            name="data",
            type="object",
            description="Data to store",
            required=True,
            schema={"type": "object", "additionalProperties": True}
        ),
        ToolParameter(
            name="operation",
            type="string",
            description="Operation type: 'create', 'update', 'upsert'",
            required=False,
            default="upsert"
        )
    ],
    outputs=[
        ToolOutput(
            name="success",
            type="boolean",
            description="Whether the operation was successful"
        ),
        ToolOutput(
            name="record_id",
            type="string",
            description="ID of the created/updated record"
        ),
        ToolOutput(
            name="operation_type",
            type="string",
            description="Type of operation performed (created/updated)"
        )
    ]
)

# Data Store Summarize Tool
DATA_STORE_SUMMARIZE_TOOL = ToolDefinition(
    name=ToolType.DATA_STORE_SUMMARIZE,
    description="Read and summarize data from a data store",
    parameters=[
        ToolParameter(
            name="store_name",
            type="string",
            description="Name of the data store to read from",
            required=True
        ),
        ToolParameter(
            name="filter",
            type="object",
            description="Optional filter criteria",
            required=False,
            schema={"type": "object", "additionalProperties": True}
        ),
        ToolParameter(
            name="summarization_type",
            type="string",
            description="Type of summarization: 'statistical', 'narrative', 'both'",
            required=False,
            default="both"
        ),
        ToolParameter(
            name="fields_to_summarize",
            type="array",
            description="Specific fields to include in the summary",
            required=False,
            schema={"type": "array", "items": {"type": "string"}}
        )
    ],
    outputs=[
        ToolOutput(
            name="total_records",
            type="number",
            description="Total number of records in the store"
        ),
        ToolOutput(
            name="summary",
            type="object",
            description="Summary of the data",
            schema={
                "type": "object",
                "properties": {
                    "statistical": {"type": "object", "additionalProperties": True},
                    "narrative": {"type": "string"}
                }
            }
        ),
        ToolOutput(
            name="sample_records",
            type="array",
            description="Sample of records from the store",
            schema={"type": "array", "items": {"type": "object", "additionalProperties": True}}
        )
    ]
)

# Registry of all available tools
TOOL_REGISTRY = {
    ToolType.GMAIL_SEARCH: GMAIL_SEARCH_TOOL,
    ToolType.EMAIL_EXTRACTION: EMAIL_EXTRACTION_TOOL,
    ToolType.DATA_STORE_UPDATE: DATA_STORE_UPDATE_TOOL,
    ToolType.DATA_STORE_SUMMARIZE: DATA_STORE_SUMMARIZE_TOOL
}

def get_tool_definition(tool_name: ToolType) -> ToolDefinition:
    """Get the definition for a specific tool"""
    return TOOL_REGISTRY.get(tool_name) 