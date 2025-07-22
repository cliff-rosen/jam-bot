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


def calculate_scholar_relevance_score(features: dict) -> int:
    """
    Calculate relevance score for Google Scholar articles based on extracted features.
    
    Args:
        features: Dictionary containing extracted features
        
    Returns:
        Relevance score (0-10)
    """
    poi_relevance = features.get("poi_relevance", "").upper()
    doi_relevance = features.get("doi_relevance", "").upper()
    is_systematic = features.get("is_systematic", "").upper()
    study_type = features.get("study_type", "")
    study_outcome = features.get("study_outcome", "")

    # Check if PoI and DoI are both 'YES'
    if poi_relevance == "YES" and doi_relevance == "YES":
        if "effectiveness" in study_outcome:
            if study_type == "human RCT":
                return 10
            else:
                return 9
        elif "safety" in study_outcome:
            return 8
        elif "diagnostics" in study_outcome:
            if is_systematic == 'YES':
                return 7
            else:
                return 6
        elif is_systematic == 'YES':
            return 3
        else:
            return 2

    # Check if PoI is 'NO' and DoI is 'YES'
    elif poi_relevance == "NO" and doi_relevance == "YES":
        if "effectiveness" in study_outcome or "safety" in study_outcome:
            if study_type in ["human RCT", "human non-RCT"]:
                if is_systematic == "YES":
                    return 5
                else:
                    return 4
            else:
                return 3
        elif "diagnostics" in study_outcome:
            if study_type in ["human RCT", "human non-RCT"]:
                return 4
            else:
                return 3
        else:
            return 2

    # Check if PoI is 'YES' and DoI is 'No'
    elif poi_relevance == "YES" and doi_relevance == "NO":
        if ("effectiveness" in study_outcome or "safety" in study_outcome):
            if study_type == "human RCT":
                return 7
            if is_systematic == "YES":
                return 6
            return 5
        elif "diagnostics" in study_outcome:
            if is_systematic == "YES":
                return 4
            else:
                return 3
        else:
            return 2

    # Default score if none of the conditions are met
    return 0


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
        if schema_name == "scholar_features":
            results = self._apply_scholar_features_post_processing(results)
        elif schema_name == "pubmed_features":
            results = self._apply_pubmed_features_post_processing(results)
        
        return results
    
    def _apply_scholar_features_post_processing(self, results: List[ExtractionResult]) -> List[ExtractionResult]:
        """
        Apply Google Scholar specific post-processing including relevance scoring.
        
        Args:
            results: List of extraction results
            
        Returns:
            List of extraction results with relevance scores added
        """
        processed_results = []
        
        for result in results:
            if result.extraction:
                # Calculate relevance score and add to extraction
                relevance_score = calculate_scholar_relevance_score(result.extraction)
                
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
    
    def _apply_pubmed_features_post_processing(self, results: List[ExtractionResult]) -> List[ExtractionResult]:
        """
        Apply PubMed specific post-processing including relevance scoring.
        
        Args:
            results: List of extraction results
            
        Returns:
            List of extraction results with relevance scores added
        """
        from schemas.pubmed_features import calculate_pubmed_relevance_score
        
        processed_results = []
        
        for result in results:
            if result.extraction:
                # Calculate relevance score and add to extraction
                relevance_score = calculate_pubmed_relevance_score(result.extraction)
                
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


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service