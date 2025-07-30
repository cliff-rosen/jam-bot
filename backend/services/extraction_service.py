"""
Extraction Service

This service provides LLM-powered extraction capabilities that can be used
by various handlers including the generic extract handler and specific
feature extraction handlers like Google Scholar feature extraction.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import json

from agents.prompts.base_prompt_caller import BasePromptCaller
from pydantic import BaseModel, Field


# Removed duplicate relevance scoring - now using unified calculate_relevance_score from research_features.py


class ExtractionResult(BaseModel):
    """Result of an extraction operation"""
    item_id: str = Field(description="Unique identifier for the source item")
    original_item: Dict[str, Any] = Field(description="The original source item")
    extraction: Optional[Dict[str, Any]] = Field(description="Extracted data matching the schema")
    error: Optional[str] = Field(default=None, description="Error message if extraction failed")
    confidence_score: Optional[float] = Field(default=None, description="Confidence in extraction (0-1)")
    extraction_timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ExtractionPromptCaller(BasePromptCaller):
    """Prompt caller for extraction functions"""
    
    def __init__(self, result_schema: Dict[str, Any]):
        """
        Initialize the extraction prompt caller with a dynamic schema.
        
        Args:
            result_schema: The JSON schema for the expected result
        """
        self.result_schema = result_schema
        
        # Define the system message template
        system_message = """You are an extraction function that processes data according to specific instructions.

## Your Task
Given a source item and field instructions, extract the requested information according to the schema.

## Guidelines
- Follow field-specific instructions precisely
- Use exact output format specified in schema
- Return null/default for missing information
- Maintain data types as specified in the schema (string, number, boolean, array, object)

## Schema
{result_schema}

## Field Instructions
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
            source_item=source_item_str,
            extraction_instructions=extraction_instructions,
            messages=[],  # No conversation history needed
            result_schema=json.dumps(self.result_schema, indent=2)
        )
        
        return response.result


class ExtractionService:
    """
    Service for performing LLM-powered extractions with various schemas and instructions.
    This service can be used by multiple handlers for different extraction tasks.
    """
    
    def __init__(self):
        """Initialize the extraction service"""
        self._prompt_callers: Dict[str, ExtractionPromptCaller] = {}
    
    def _get_prompt_caller(self, schema_key: str, result_schema: Dict[str, Any]) -> ExtractionPromptCaller:
        """
        Get or create a prompt caller for the given schema.
        
        Args:
            schema_key: Unique key for this schema type
            result_schema: The JSON schema for extraction results
            
        Returns:
            ExtractionPromptCaller configured for this schema
        """
        if schema_key not in self._prompt_callers:
            self._prompt_callers[schema_key] = ExtractionPromptCaller(result_schema)
        return self._prompt_callers[schema_key]
    
    async def perform_extraction(
        self,
        item: Dict[str, Any],
        result_schema: Dict[str, Any],
        extraction_instructions: str,
        schema_key: Optional[str] = None
    ) -> ExtractionResult:
        """
        Extract information from a single item using the provided schema and instructions.
        
        Args:
            item: The source item to extract from
            result_schema: JSON schema defining the structure of extraction results
            extraction_instructions: Natural language instructions for extraction
            schema_key: Optional key for caching the prompt caller (defaults to hash of schema)
            
        Returns:
            ExtractionResult containing the extracted data or error information
        """
        # Generate schema key if not provided
        if schema_key is None:
            schema_key = str(hash(json.dumps(result_schema, sort_keys=True)))
        
        # Get item ID
        item_id = item.get("id", str(uuid.uuid4()))
        
        try:
            # Get the appropriate prompt caller
            prompt_caller = self._get_prompt_caller(schema_key, result_schema)
            
            # Perform the extraction
            extraction_result = await prompt_caller.invoke_extraction(
                source_item=item,
                extraction_instructions=extraction_instructions
            )
            
            return ExtractionResult(
                item_id=item_id,
                original_item=item,
                extraction=extraction_result,
                confidence_score=extraction_result.get("confidence_score")
            )
            
        except Exception as e:
            return ExtractionResult(
                item_id=item_id,
                original_item=item,
                extraction=None,
                error=str(e)
            )
    
    async def extract_multiple_items(
        self,
        items: List[Dict[str, Any]],
        result_schema: Dict[str, Any],
        extraction_instructions: str,
        schema_key: Optional[str] = None,
        continue_on_error: bool = True
    ) -> List[ExtractionResult]:
        """
        Extract information from multiple items using the same schema and instructions.
        
        Args:
            items: List of source items to extract from
            result_schema: JSON schema defining the structure of extraction results
            extraction_instructions: Natural language instructions for extraction
            schema_key: Optional key for caching the prompt caller
            continue_on_error: Whether to continue processing if individual items fail
            
        Returns:
            List of ExtractionResult objects
        """
        results = []
        
        for item in items:
            try:
                result = await self.perform_extraction(
                    item=item,
                    result_schema=result_schema,
                    extraction_instructions=extraction_instructions,
                    schema_key=schema_key
                )
                results.append(result)
                
            except Exception as e:
                if continue_on_error:
                    # Create error result and continue
                    item_id = item.get("id", str(uuid.uuid4()))
                    results.append(ExtractionResult(
                        item_id=item_id,
                        original_item=item,
                        extraction=None,
                        error=str(e)
                    ))
                else:
                    # Re-raise the exception to stop processing
                    raise
        
        return results
    
    async def extract_with_predefined_schema(
        self,
        items: List[Dict[str, Any]],
        schema_name: str,
        predefined_schemas: Dict[str, Dict[str, Any]],
        predefined_instructions: Dict[str, str]
    ) -> List[ExtractionResult]:
        """
        Extract using predefined schemas and instructions (e.g., for Google Scholar features).
        
        Args:
            items: List of source items to extract from
            schema_name: Name of the predefined schema to use
            predefined_schemas: Dictionary mapping schema names to JSON schemas
            predefined_instructions: Dictionary mapping schema names to extraction instructions
            
        Returns:
            List of ExtractionResult objects
        """
        if schema_name not in predefined_schemas:
            raise ValueError(f"Unknown schema: {schema_name}")
        
        if schema_name not in predefined_instructions:
            raise ValueError(f"No instructions defined for schema: {schema_name}")
        
        # Perform the extraction
        results = await self.extract_multiple_items(
            items=items,
            result_schema=predefined_schemas[schema_name],
            extraction_instructions=predefined_instructions[schema_name],
            schema_key=schema_name
        )
        
        # Apply post-processing based on schema type
        if schema_name == "research_features":
            results = self._apply_research_features_post_processing(results)
        
        return results
    
    def _apply_research_features_post_processing(self, results: List[ExtractionResult]) -> List[ExtractionResult]:
        """
        Apply research features post-processing including relevance scoring.
        
        Args:
            results: List of extraction results
            
        Returns:
            List of extraction results with relevance scores added
        """
        from schemas.research_features import calculate_relevance_score
        
        processed_results = []
        
        for result in results:
            if result.extraction:
                # Calculate relevance score and add to extraction
                relevance_score = calculate_relevance_score(result.extraction)
                
                # Add score to the extraction data
                enhanced_extraction = result.extraction.copy()
                enhanced_extraction["relevance_score"] = relevance_score
                
                # Create new result with enhanced extraction
                enhanced_result = ExtractionResult(
                    item_id=result.item_id,
                    original_item=result.original_item,
                    extraction=enhanced_extraction,
                    error=result.error,
                    confidence_score=result.confidence_score,
                    extraction_timestamp=result.extraction_timestamp
                )
                processed_results.append(enhanced_result)
            else:
                # Keep original result if extraction failed
                processed_results.append(result)
        
        return processed_results
    
    def _get_default_value(self, column_type: str, column_options: Optional[Dict[str, Any]] = None) -> str:
        """Get default value for a column type when extraction fails"""
        if column_type == "boolean":
            return "no"
        elif column_type in ["score", "number"]:
            options = column_options or {}
            min_val = options.get('min', 1)
            max_val = options.get('max', 10)
            default_val = (min_val + max_val) / 2
            return str(default_val)
        else:  # text
            return "error"
    
    def _clean_extracted_value(self, value: Any, column_type: str, column_options: Optional[Dict[str, Any]] = None) -> str:
        """Clean and validate extracted values based on column type"""
        if column_type == "boolean":
            clean_val = str(value).lower().strip()
            return clean_val if clean_val in ["yes", "no"] else "no"
        elif column_type in ["score", "number"]:
            try:
                num_val = float(value)
                options = column_options or {}
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                # Clamp to range
                clamped_val = max(min_val, min(max_val, num_val))
                return str(clamped_val)
            except (ValueError, TypeError):
                return self._get_default_value(column_type, column_options)
        else:  # text
            return str(value)[:100]
    
    def _build_column_schema_property(self, column_config: Dict[str, Any]) -> Dict[str, Any]:
        """Build schema property for a single column"""
        col_type = column_config.get('type', 'text')
        description = column_config['description']
        
        if col_type == 'boolean':
            return {
                "type": "string",
                "enum": ["yes", "no"],
                "description": description
            }
        elif col_type in ['score', 'number']:
            options = column_config.get('options', {})
            min_val = options.get('min', 1)
            max_val = options.get('max', 10)
            return {
                "type": "number",
                "minimum": min_val,
                "maximum": max_val,
                "description": description
            }
        else:  # text
            return {
                "type": "string",
                "maxLength": 100,
                "description": description
            }

    async def extract_unified_columns(
        self,
        articles: List[Dict[str, Any]],
        columns: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Wrapper for extract_multiple_columns that uses the unified extraction service.
        Extracts multiple columns from articles using a single LLM call per article.
        
        Args:
            articles: List of articles with id, title, abstract
            columns: List of column definitions with name, description, type, options
            
        Returns:
            Dictionary mapping article ID to column_name to extracted value
        """
        if not columns:
            return {}
        
        # Build the multi-column schema
        properties = {}
        column_map = {}  # name -> config for easy lookup
        
        for column in columns:
            col_name = column['name']
            column_map[col_name] = column
            properties[col_name] = self._build_column_schema_property(column)
        
        result_schema = {
            "type": "object",
            "properties": properties,
            "required": list(column_map.keys())
        }
        
        # Build clean field instructions (domain-specific knowledge goes here)
        instruction_parts = []
        
        for column in columns:
            col_name = column['name']
            col_type = column.get('type', 'text')
            description = column['description']  # Already contains article-specific context
            
            # Add output format hints based on type
            if col_type == 'boolean':
                format_hint = "(Answer: 'yes' or 'no')"
            elif col_type in ['score', 'number']:
                options = column.get('options', {})
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                format_hint = f"(Numeric score {min_val}-{max_val})"
            else:
                format_hint = "(Brief text, max 100 chars)"
            
            instruction_parts.append(f"- {col_name}: {description} {format_hint}")
        
        extraction_instructions = "\n".join(instruction_parts)
        
        # Extract for all articles
        results = {}
        for article in articles:
            article_id = article['id']
            
            try:
                # Clean source item structure
                source_item = {
                    "id": article['id'],
                    "title": article.get('title', ''),
                    "abstract": article.get('abstract', '')
                }
                
                # Use the single item extraction method
                extraction_result = await self.perform_extraction(
                    item=source_item,
                    result_schema=result_schema,
                    extraction_instructions=extraction_instructions,
                    schema_key="unified_columns"
                )
                
                # Process the results
                article_results = {}
                if extraction_result.extraction:
                    for column in columns:
                        col_name = column['name']
                        col_type = column.get('type', 'text')
                        col_options = column.get('options')
                        
                        if col_name in extraction_result.extraction:
                            raw_value = extraction_result.extraction[col_name]
                            article_results[col_name] = self._clean_extracted_value(raw_value, col_type, col_options)
                        else:
                            article_results[col_name] = self._get_default_value(col_type, col_options)
                else:
                    # Handle extraction failure - use defaults for all columns
                    for column in columns:
                        col_name = column['name']
                        col_type = column.get('type', 'text')
                        col_options = column.get('options')
                        article_results[col_name] = self._get_default_value(col_type, col_options)
                
                results[article_id] = article_results
                
            except Exception as e:
                # On error, use default values for all columns
                article_results = {}
                for column in columns:
                    col_name = column['name']
                    col_type = column.get('type', 'text')
                    col_options = column.get('options')
                    article_results[col_name] = self._get_default_value(col_type, col_options)
                results[article_id] = article_results
                
        return results


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service