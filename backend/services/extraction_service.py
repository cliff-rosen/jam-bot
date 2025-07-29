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
- If you're uncertain about an extraction, note this in confidence_score or extraction_notes if available

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
    
    async def extract_single_item(
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
                result = await self.extract_single_item(
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
    
    async def extract_tabelizer_column(
        self,
        articles: List[Dict[str, Any]],
        column_name: str,
        column_description: str,
        column_type: str = "boolean",
        column_options: Optional[Dict[str, Any]] = None,
        user_id: str = None
    ) -> Dict[str, str]:
        """
        Extract custom column data for Tabelizer using the extraction service pattern
        
        Args:
            articles: List of articles with id, title, abstract
            column_name: Name of the column
            column_description: Natural language description of what to extract
            column_type: "boolean" or "text"
            user_id: User ID for tracking
            
        Returns:
            Dictionary mapping article ID to extracted value
        """
        # Define schema based on column type
        if column_type == "boolean":
            result_schema = {
                "type": "object",
                "properties": {
                    "answer": {
                        "type": "string",
                        "enum": ["yes", "no"],
                        "description": "Answer to the question"
                    }
                },
                "required": ["answer"]
            }
            extraction_instructions = f"""
You are analyzing a research article to answer a specific question.

Article Title: {{title}}
Abstract: {{abstract}}

Question: {column_description}

Answer with only 'yes' or 'no' based on the article content.
"""
        elif column_type == "score":
            # Get range from options or use defaults
            min_val = column_options.get('min', 1) if column_options else 1
            max_val = column_options.get('max', 10) if column_options else 10
            step = column_options.get('step', 1) if column_options else 1
            
            result_schema = {
                "type": "object",
                "properties": {
                    "answer": {
                        "type": "number",
                        "minimum": min_val,
                        "maximum": max_val,
                        "description": f"Numeric {column_type} from {min_val} to {max_val}"
                    }
                },
                "required": ["answer"]
            }
            
            extraction_instructions = f"""
You are analyzing a research article to assign a numeric score.

Article Title: {{title}}
Abstract: {{abstract}}

Task: {column_description}

Provide a numeric score from {min_val} to {max_val} based on the article content.
Only return the number, nothing else.
"""
        else:  # text
            result_schema = {
                "type": "object", 
                "properties": {
                    "answer": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "Brief extracted text answer"
                    }
                },
                "required": ["answer"]
            }
            extraction_instructions = f"""
You are analyzing a research article to extract specific information.

Article Title: {{title}}
Abstract: {{abstract}}

Task: {column_description}

Provide a brief answer in 100 characters or less.
"""
        
        # Use the existing extraction service infrastructure
        results = {}
        for article in articles:
            try:
                # Format the instructions with article data
                formatted_instructions = extraction_instructions.format(
                    title=article.get('title', ''),
                    abstract=article.get('abstract', '')
                )
                
                # Use the single item extraction method
                extraction_result = await self.extract_single_item(
                    item=article,
                    result_schema=result_schema,
                    extraction_instructions=formatted_instructions,
                    schema_key=f"tabelizer_{column_type}"
                )
                
                # Extract the answer
                if extraction_result.extraction and 'answer' in extraction_result.extraction:
                    answer = extraction_result.extraction['answer']
                    
                    # Clean up answer based on type
                    if column_type == "boolean":
                        answer = str(answer).lower().strip()
                        if answer not in ["yes", "no"]:
                            answer = "no"  # Default to no if unclear
                    elif column_type == "score":
                        # Ensure numeric answers are valid
                        try:
                            num_answer = float(answer)
                            min_val = column_options.get('min', 1) if column_options else 1
                            max_val = column_options.get('max', 10) if column_options else 10
                            # Clamp to range
                            num_answer = max(min_val, min(max_val, num_answer))
                            answer = str(num_answer)
                        except (ValueError, TypeError):
                            # Default to middle of range if parsing fails
                            default_val = (column_options.get('min', 1) + column_options.get('max', 10)) / 2 if column_options else 5
                            answer = str(default_val)
                    else:
                        # Truncate text answers
                        answer = str(answer)[:100]
                    
                    results[article['id']] = answer
                else:
                    # Handle extraction failure
                    if column_type == "boolean":
                        results[article['id']] = "no"
                    elif column_type == "score":
                        default_val = (column_options.get('min', 1) + column_options.get('max', 10)) / 2 if column_options else 5
                        results[article['id']] = str(default_val)
                    else:
                        results[article['id']] = "error"
                    
            except Exception as e:
                # On error, use default value
                if column_type == "boolean":
                    results[article['id']] = "no"
                elif column_type == "score":
                    default_val = (column_options.get('min', 1) + column_options.get('max', 10)) / 2 if column_options else 5
                    results[article['id']] = str(default_val)
                else:
                    results[article['id']] = "error"
                
        return results
    
    def extract_multiple_columns(
        self,
        articles: List[Dict[str, Any]],
        columns_config: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synchronous wrapper for extract_tabelizer_multiple_columns to match expected interface.
        
        Args:
            articles: List of articles with id, title, abstract
            columns_config: Dict of column_name -> {description, type, options}
            
        Returns:
            Dictionary with results and metadata
        """
        import asyncio
        
        # Run the async method synchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            results = loop.run_until_complete(
                self.extract_tabelizer_multiple_columns(articles, columns_config)
            )
            return {
                "results": results,
                "metadata": {
                    "total_articles": len(articles),
                    "total_columns": len(columns_config)
                }
            }
        finally:
            loop.close()
    
    async def extract_tabelizer_multiple_columns(
        self,
        articles: List[Dict[str, Any]],
        columns_config: Dict[str, Dict[str, str]],
        user_id: str = None
    ) -> Dict[str, Dict[str, str]]:
        """
        Extract multiple custom columns for Tabelizer using a single extraction call
        
        Args:
            articles: List of articles with id, title, abstract
            columns_config: Dict of column_name -> {description, type}
            user_id: User ID for tracking
            
        Returns:
            Dictionary mapping article ID to column_name to extracted value
        """
        # Build the multi-column schema
        properties = {}
        for col_name, config in columns_config.items():
            col_type = config.get('type', 'text')
            if col_type == 'boolean':
                properties[col_name] = {
                    "type": "string",
                    "enum": ["yes", "no"],
                    "description": config['description']
                }
            elif col_type == 'score' or col_type == 'number':
                # Get range from options
                options = config.get('options', {})
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                properties[col_name] = {
                    "type": "number",
                    "minimum": min_val,
                    "maximum": max_val,
                    "description": config['description']
                }
            else:
                properties[col_name] = {
                    "type": "string",
                    "maxLength": 100,
                    "description": config['description']
                }
        
        result_schema = {
            "type": "object",
            "properties": properties,
            "required": list(columns_config.keys())
        }
        
        # Build extraction instructions
        instruction_parts = ["You are analyzing a research article to extract multiple pieces of information.", ""]
        instruction_parts.append("Article Title: {title}")
        instruction_parts.append("Abstract: {abstract}")
        instruction_parts.append("")
        instruction_parts.append("Extract the following information:")
        
        for col_name, config in columns_config.items():
            col_type = config.get('type', 'text')
            if col_type == 'boolean':
                type_instruction = "Answer with 'yes' or 'no'"
            elif col_type == 'score' or col_type == 'number':
                options = config.get('options', {})
                min_val = options.get('min', 1)
                max_val = options.get('max', 10)
                type_instruction = f"Provide a numeric score from {min_val} to {max_val}"
            else:
                type_instruction = "Provide a brief answer (max 100 chars)"
            instruction_parts.append(f"- {col_name}: {config['description']} ({type_instruction})")
        
        extraction_instructions = "\n".join(instruction_parts)
        
        # Extract for all articles
        results = {}
        for article in articles:
            try:
                # Format the instructions with article data
                formatted_instructions = extraction_instructions.format(
                    title=article.get('title', ''),
                    abstract=article.get('abstract', '')
                )
                
                # Use the single item extraction method
                extraction_result = await self.extract_single_item(
                    item=article,
                    result_schema=result_schema,
                    extraction_instructions=formatted_instructions,
                    schema_key="tabelizer_multi_column"
                )
                
                # Process the results
                article_results = {}
                if extraction_result.extraction:
                    for col_name, config in columns_config.items():
                        col_type = config.get('type', 'text')
                        if col_name in extraction_result.extraction:
                            value = extraction_result.extraction[col_name]
                            
                            # Clean up values based on type
                            if col_type == 'boolean':
                                value = str(value).lower().strip()
                                if value not in ["yes", "no"]:
                                    value = "no"  # Default to no if unclear
                            elif col_type == 'score' or col_type == 'number':
                                # Ensure numeric values are valid
                                try:
                                    num_value = float(value)
                                    options = config.get('options', {})
                                    min_val = options.get('min', 1)
                                    max_val = options.get('max', 10)
                                    # Clamp to range
                                    num_value = max(min_val, min(max_val, num_value))
                                    value = str(num_value)
                                except (ValueError, TypeError):
                                    # Default to middle of range if parsing fails
                                    options = config.get('options', {})
                                    default_val = (options.get('min', 1) + options.get('max', 10)) / 2
                                    value = str(default_val)
                            else:
                                # Truncate text values
                                value = str(value)[:100]
                            
                            article_results[col_name] = value
                        else:
                            # Handle missing columns
                            if col_type == 'boolean':
                                article_results[col_name] = "no"
                            elif col_type == 'score' or col_type == 'number':
                                options = config.get('options', {})
                                default_val = (options.get('min', 1) + options.get('max', 10)) / 2
                                article_results[col_name] = str(default_val)
                            else:
                                article_results[col_name] = "error"
                else:
                    # Handle extraction failure
                    for col_name, config in columns_config.items():
                        col_type = config.get('type', 'text')
                        if col_type == 'boolean':
                            article_results[col_name] = "no"
                        elif col_type == 'score' or col_type == 'number':
                            options = config.get('options', {})
                            default_val = (options.get('min', 1) + options.get('max', 10)) / 2
                            article_results[col_name] = str(default_val)
                        else:
                            article_results[col_name] = "error"
                
                results[article['id']] = article_results
                
            except Exception as e:
                # On error, use default values for all columns
                article_results = {}
                for col_name, config in columns_config.items():
                    col_type = config.get('type', 'text')
                    if col_type == 'boolean':
                        article_results[col_name] = "no"
                    elif col_type == 'score' or col_type == 'number':
                        options = config.get('options', {})
                        default_val = (options.get('min', 1) + options.get('max', 10)) / 2
                        article_results[col_name] = str(default_val)
                    else:
                        article_results[col_name] = "error"
                results[article['id']] = article_results
                
        return results


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service