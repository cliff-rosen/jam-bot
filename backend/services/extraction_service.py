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
from typing import Union
from schemas.entity_extraction import EntityRelationshipAnalysis, EntityExtractionRequest, EntityExtractionResponse


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
        
        # Initialize the base class with the JSON schema directly
        # BasePromptCaller will handle the conversion to Pydantic model
        super().__init__(
            response_model=result_schema,  # Pass JSON schema directly
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
            result_schema=json.dumps(self.get_schema(), indent=2)
        )
        
        # The response is the structured Pydantic model, convert to dict
        if hasattr(response, 'model_dump'):
            return response.model_dump()
        elif hasattr(response, 'dict'):
            return response.dict()
        else:
            # Fallback - should not happen with proper Pydantic models
            return dict(response) if hasattr(response, '__dict__') else response


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
    
    async def extract_entity_relationships(self, request: EntityExtractionRequest) -> EntityExtractionResponse:
        """
        Extract entity relationships from an article using specialized prompts.
        
        Args:
            request: EntityExtractionRequest with article details
            
        Returns:
            EntityExtractionResponse with entity relationship analysis
        """
        # Prepare the article data for extraction
        article_data = {
            "id": request.article_id,
            "title": request.title,
            "abstract": request.abstract,
            "full_text": request.full_text
        }
        
        # Build extraction instructions
        extraction_instructions = self._build_entity_extraction_instructions(request)
        
        # Define the result schema for entity relationship analysis
        result_schema = {
            "type": "object",
            "properties": {
                "pattern_complexity": {
                    "type": "string",
                    "enum": ["SIMPLE", "COMPLEX"],
                    "description": "Overall pattern complexity classification"
                },
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["medical_condition", "biological_factor", "intervention", 
                                        "patient_characteristic", "psychological_factor", "outcome",
                                        "gene", "protein", "pathway", "drug", "other"]
                            },
                            "description": {"type": "string"},
                            "mentions": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": ["id", "name", "type"]
                    }
                },
                "relationships": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_entity_id": {"type": "string"},
                            "target_entity_id": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": ["causal", "therapeutic", "associative", "temporal",
                                        "inhibitory", "regulatory", "interactive", "paradoxical"]
                            },
                            "description": {"type": "string"},
                            "evidence": {"type": "string"},
                            "strength": {
                                "type": "string",
                                "enum": ["strong", "moderate", "weak"]
                            }
                        },
                        "required": ["source_entity_id", "target_entity_id", "type", "description"]
                    }
                },
                "complexity_justification": {"type": "string"},
                "clinical_significance": {"type": "string"},
                "key_findings": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["pattern_complexity", "entities", "relationships"]
        }
        
        # Perform the extraction
        extraction_result = await self.perform_extraction(
            item=article_data,
            result_schema=result_schema,
            extraction_instructions=extraction_instructions,
            schema_key="entity_relationships"
        )
        
        if extraction_result.error:
            raise ValueError(f"Entity extraction failed: {extraction_result.error}")
        
        # Convert to EntityRelationshipAnalysis
        analysis = EntityRelationshipAnalysis(**extraction_result.extraction)
        
        return EntityExtractionResponse(
            article_id=request.article_id,
            analysis=analysis,
            extraction_metadata={
                "extraction_timestamp": extraction_result.extraction_timestamp,
                "confidence_score": extraction_result.confidence_score,
                "include_gene_data": request.include_gene_data,
                "include_drug_data": request.include_drug_data,
                "focus_areas": request.focus_areas
            }
        )
    
    def _build_entity_extraction_instructions(self, request: EntityExtractionRequest) -> str:
        """Build extraction instructions for entity relationship analysis"""
        
        base_instructions = """
# Instructions for Identifying Entity Relationship Patterns in Research Abstracts

## Objective:
Analyze the research article to identify and classify the complexity of entity relationships, distinguishing between simple experimental designs and complex multi-factorial patterns.

## Step-by-Step Process:

### 1. Extract Key Entities
Identify and list all primary entities mentioned in the article:
- Medical conditions/diseases (e.g., Wernicke encephalopathy, MC4R deficiency)
- Biological factors (e.g., thiamine deficiency, hyperphagia)
- Interventions/treatments (e.g., thiamine therapy)
- Patient characteristics (e.g., age, symptoms)
- Psychological/behavioral factors (e.g., anxiety, restrictive eating)
- Outcomes/measurements (e.g., neurological improvement, weight loss)
- Genes and proteins (if genetic data available)
- Drugs and compounds (if pharmacological data available)

For each entity provide:
- Unique ID (entity_1, entity_2, etc.)
- Name (as mentioned in text)
- Type classification
- Brief description
- Key text mentions where the entity appears

### 2. Map Direct Relationships
For each entity pair, identify the relationship type:
- **Causal**: A causes B (thiamine deficiency → Wernicke encephalopathy)
- **Therapeutic**: Treatment X improves condition Y (thiamine therapy → neurological improvement)
- **Associative**: A correlates with B (obesity associated with MC4R deficiency)
- **Temporal**: A occurs before/after B (anxiety preceded restrictive eating)
- **Inhibitory**: A blocks/prevents B
- **Regulatory**: A controls/regulates B
- **Interactive**: A and B interact with each other
- **Paradoxical**: Contradictory coexisting conditions

### 3. Classify Pattern Complexity

**SIMPLE PATTERNS (Linear A→B relationships):**
- "Patients with Disease X received Treatment Y, measured Outcome Z"
- "Drug A was given to Population B to assess Effect C"
- Single cause → single effect chains
- Direct intervention → outcome studies

**COMPLEX PATTERNS (Multi-factorial, paradoxical, or interactive):**
- Paradoxical: Contradictory coexisting conditions (hyperphagia + food restriction)
- Multi-causal: Multiple factors contributing to single outcome
- Cascade effects: A→B→C→D chains with multiple intermediates
- Gene-environment interactions: Genetic predisposition modified by external factors
- Phenotypic complexity: Single genotype producing multiple, seemingly unrelated phenotypes

### 4. Key Indicators for Complex Patterns
Look for these linguistic and conceptual markers:
- Paradox words: "despite," "coexistence," "contradictory," "unexpected"
- Multi-factorial language: "complex interactions," "multiple pathways"
- Modifier phrases: "even in the presence of," "overridden by"
- Cascade descriptions: Multiple "leading to" or "resulting in" statements
- Phenotypic diversity: Single cause producing multiple, varied effects

### 5. Analysis Requirements
Provide:
- Complete entity list with proper typing
- All significant relationships between entities
- Pattern classification: SIMPLE or COMPLEX
- Complexity justification: Specific features that make it complex (if applicable)
- Clinical significance: Why this pattern matters for understanding or treatment
- Key findings: 3-5 most important discoveries from the analysis

## Focus Areas:"""
        
        # Add focus areas if specified
        if request.focus_areas:
            base_instructions += f"\nPay special attention to: {', '.join(request.focus_areas)}"
        
        # Add data type preferences
        include_notes = []
        if request.include_gene_data:
            include_notes.append("Include genetic and protein entities where relevant")
        if request.include_drug_data:
            include_notes.append("Include drug and pharmacological entities where relevant")
        
        if include_notes:
            base_instructions += f"\n\nSpecial Instructions:\n" + "\n".join(f"- {note}" for note in include_notes)
        
        return base_instructions


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service