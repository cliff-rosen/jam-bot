"""
Handler implementation for the extract tool.

This tool applies extraction functions to items in a list.
Each extraction function has a schema for the result and natural language instructions
for how to produce that schema from the source record.
"""

from typing import List, Dict, Any
from datetime import datetime
import uuid
import json
from pydantic import BaseModel, Field
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionHandler
from tools.tool_registry import register_tool_handler
from agents.prompts.base_prompt_caller import BasePromptCaller

class ExtractionResult(BaseModel):
    """Dynamic extraction result - the structure is defined by the schema"""
    # This is a placeholder - the actual schema will be dynamically set
    result: Dict[str, Any] = Field(description="The extracted result matching the provided schema")

class ExtractionPromptCaller(BasePromptCaller):
    """Prompt caller for extraction functions"""
    
    def __init__(self, result_schema: Dict[str, Any]):
        """
        Initialize the extraction prompt caller with a dynamic schema.
        
        Args:
            result_schema: The JSON schema for the expected result
        """
        # Create a dynamic response model based on the schema
        self.result_schema = result_schema
        
        # Define the system message
        system_message = """You are an extraction function that processes data according to specific instructions and returns results in a defined schema.

## Your Task
Given a source item and extraction instructions, you must:
1. Analyze the source item according to the instructions
2. Extract or compute the required information
3. Return the result in the exact format specified by the schema

## Important Guidelines
- Follow the extraction instructions precisely
- Return results that exactly match the provided schema
- If the schema specifies required fields, ensure all are present
- If a field cannot be extracted, use null or an appropriate default value
- Maintain data types as specified in the schema (string, number, boolean, array, object)

## Schema
{result_schema}

## Extraction Instructions
{extraction_instructions}

## Source Item
{source_item}

Please extract the required information and return it in the specified schema format."""

        # Create a dynamic response model
        class DynamicExtractionResult(BaseModel):
            result: Dict[str, Any] = Field(description="The extracted result matching the provided schema")
            
            class Config:
                extra = "allow"  # Allow extra fields to accommodate dynamic schema
        
        # Initialize the base class with the dynamic model
        super().__init__(
            response_model=DynamicExtractionResult,
            system_message=system_message,
            messages_placeholder=False  # We don't need conversation history for extraction
        )
    
    async def invoke_extraction(
        self,
        source_item: Dict[str, Any],
        extraction_instructions: str
    ) -> Dict[str, Any]:
        """
        Invoke the extraction function.
        
        Args:
            source_item: The item to extract from
            extraction_instructions: Natural language instructions for extraction
            
        Returns:
            The extracted result matching the schema
        """
        # Format the source item as a readable string
        source_item_str = json.dumps(source_item, indent=2, default=str)
        
        # Call the base invoke method with our variables
        response = await self.invoke(
            messages=[],  # No conversation history needed
            result_schema=json.dumps(self.result_schema, indent=2),
            extraction_instructions=extraction_instructions,
            source_item=source_item_str
        )
        
        return response.result

async def handle_extract(input: ToolExecutionInput) -> Dict[str, Any]:
    """
    Apply extraction functions to items in a list.
    
    Args:
        input: ToolExecutionInput containing:
            - items: List of items to process
            - extraction_function: Function or prompt describing what to extract
            - extraction_fields: List of field names to extract
            - batch_process: Whether to process as batch or individual items
            
    Returns:
        Dict containing:
            - extractions: List of item ID and extraction pairs
    """
    # Extract parameters
    items = input.params.get("items", [])
    extraction_function = input.params.get("extraction_function")
    extraction_fields = input.params.get("extraction_fields", [])
    batch_process = input.params.get("batch_process", True)
    
    if not items:
        return {
            "extractions": []
        }
    
    if not extraction_function:
        raise ValueError("extraction_function is required")
    
    if not extraction_fields:
        raise ValueError("extraction_fields is required")
    
    extractions = []
    
    # Create a schema from the extraction fields
    result_schema = {
        "type": "object",
        "properties": {field: {"type": "string"} for field in extraction_fields},
        "required": extraction_fields
    }
    
    # Process each item individually
    for item in items:
        try:
            extraction_result = await _apply_extraction_function(
                item, result_schema, extraction_function
            )
            extractions.append(extraction_result)
        except Exception as e:
            # Create failed extraction record
            extractions.append({
                "item_id": item.get("id", str(uuid.uuid4())),
                "original_item": item,
                "extraction": None,
                "error": str(e)
            })
    
    return {
        "extractions": extractions
    }

async def _apply_extraction_function(
    item: Dict[str, Any], 
    result_schema: Dict[str, Any],
    extraction_instructions: str
) -> Dict[str, Any]:
    """
    Apply an extraction function to a single item.
    
    Args:
        item: The item to process
        result_schema: Schema defining the structure of the extraction result
        extraction_instructions: Natural language instructions for how to produce the result
        
    Returns:
        Dict containing item_id, original_item, and extraction result
    """
    # Create the extraction prompt caller with the provided schema
    prompt_caller = ExtractionPromptCaller(result_schema)
    
    # Invoke the extraction
    extraction_result = await prompt_caller.invoke_extraction(
        source_item=item,
        extraction_instructions=extraction_instructions
    )
    
    # Return the structured result
    item_id = item.get("id", str(uuid.uuid4()))
    
    return {
        "item_id": item_id,
        "original_item": item,
        "extraction": extraction_result
    }

# Register the handler
register_tool_handler(
    "extract",
    ToolExecutionHandler(
        handler=handle_extract,
        description="Applies extraction functions to items in a list using schema and instructions"
    )
) 