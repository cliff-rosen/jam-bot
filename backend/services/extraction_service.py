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
        user_id: str = None
    ) -> Dict[str, str]:
        """
        Extract custom column data for Tabelizer
        
        Args:
            articles: List of articles with id, title, abstract
            column_name: Name of the column
            column_description: Natural language description of what to extract
            column_type: "boolean" or "text"
            user_id: User ID for tracking
            
        Returns:
            Dictionary mapping article ID to extracted value
        """
        from ..services.llm.base import get_llm_service
        
        llm_service = get_llm_service()
        results = {}
        
        for article in articles:
            # Build prompt based on column type
            if column_type == "boolean":
                prompt = f"""
Article Title: {article['title']}
Abstract: {article['abstract']}

Question: {column_description}

Answer with only 'yes' or 'no'.
"""
            else:
                prompt = f"""
Article Title: {article['title']}
Abstract: {article['abstract']}

Task: {column_description}

Provide a brief answer in 100 characters or less.
"""
            
            try:
                # Use simple generation for MVP
                response = await llm_service.generate(
                    prompt=prompt,
                    temperature=0.1,  # Low temperature for consistency
                    max_tokens=50
                )
                
                # Clean up response
                answer = response.strip().lower()
                
                # For boolean, ensure it's yes/no
                if column_type == "boolean":
                    if "yes" in answer:
                        answer = "yes"
                    elif "no" in answer:
                        answer = "no"
                    else:
                        answer = "no"  # Default to no if unclear
                else:
                    # For text, truncate to 100 chars
                    answer = answer[:100]
                
                results[article['id']] = answer
                
            except Exception as e:
                # On error, use default value
                results[article['id']] = "no" if column_type == "boolean" else "error"
                
        return results


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service