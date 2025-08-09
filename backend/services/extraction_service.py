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
from pydantic import BaseModel, Field
from typing import Union

from agents.prompts.base_prompt_caller import BasePromptCaller

from schemas.entity_extraction import (
    EntityRelationshipAnalysis, 
    EntityExtractionRequest, 
    EntityExtractionResponse,
    ArticleArchetype,
    StudyType
)


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
    
    async def extract_focused_entity_relationships(
        self, 
        article_id: str,
        title: str,
        abstract: str,
        full_text: str,
        focus_entities: List[str]
    ) -> EntityExtractionResponse:
        """
        Extract entity relationships focusing on specific entities of interest.
        Constructs a graph showing relationships between the specified entities in the text.
        
        Args:
            article_id: Unique identifier for the article
            title: Article title
            abstract: Article abstract
            full_text: Full article text
            focus_entities: List of specific entities to focus on (e.g., ["genetically engineered mice", "asbestos exposure", "mesothelioma"])
            
        Returns:
            EntityExtractionResponse with focused entity relationship analysis
        """
        # Prepare the article data for extraction
        article_data = {
            "id": article_id,
            "title": title,
            "abstract": abstract,
            "full_text": full_text
        }
        
        # Build focused extraction instructions
        extraction_instructions = self._build_focused_entity_extraction_instructions(focus_entities)
        
        # Define the result schema for focused entity relationship analysis
        result_schema = {
            "type": "object",
            "properties": {
                "pattern_complexity": {
                    "type": "string",
                    "enum": ["SIMPLE", "COMPLEX"],
                    "description": "Overall pattern complexity classification"
                },
                "focus_entities": {
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
                                        "gene", "protein", "pathway", "drug", "environmental_factor",
                                        "animal_model", "exposure", "other"]
                            },
                            "description": {"type": "string"},
                            "mentions": {
                                "type": "array",
                                "items": {"type": "string"}
                            },
                            "relevance_score": {
                                "type": "number",
                                "description": "How relevant this entity is to the focus entities (0-1)"
                            }
                        },
                        "required": ["id", "name", "type", "relevance_score"]
                    }
                },
                "related_entities": {
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
                                        "gene", "protein", "pathway", "drug", "environmental_factor",
                                        "animal_model", "exposure", "other"]
                            },
                            "description": {"type": "string"},
                            "connection_to_focus": {"type": "string"}
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
                                        "inhibitory", "regulatory", "interactive", "paradoxical", 
                                        "correlative", "predictive"]
                            },
                            "description": {"type": "string"},
                            "evidence": {"type": "string"},
                            "strength": {
                                "type": "string",
                                "enum": ["strong", "moderate", "weak"]
                            },
                            "involves_focus_entity": {
                                "type": "boolean",
                                "description": "Whether this relationship directly involves at least one focus entity"
                            }
                        },
                        "required": ["source_entity_id", "target_entity_id", "type", "description", "involves_focus_entity"]
                    }
                },
                "focus_entity_network": {
                    "type": "object",
                    "properties": {
                        "central_nodes": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Entity IDs that are central to the focus entity network"
                        },
                        "key_pathways": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "pathway": {
                                        "type": "array",
                                        "items": {"type": "string"}
                                    },
                                    "description": {"type": "string"}
                                },
                                "required": ["pathway", "description"]
                            }
                        },
                        "network_density": {
                            "type": "string",
                            "enum": ["sparse", "moderate", "dense"],
                            "description": "How interconnected the focus entities are"
                        }
                    }
                },
                "complexity_justification": {"type": "string"},
                "clinical_significance": {"type": "string"},
                "key_findings": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "focus_entity_insights": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "focus_entity": {"type": "string"},
                            "key_insight": {"type": "string"},
                            "supporting_evidence": {"type": "string"}
                        },
                        "required": ["focus_entity", "key_insight"]
                    }
                }
            },
            "required": ["pattern_complexity", "focus_entities", "relationships", "focus_entity_network"]
        }
        
        # Perform the extraction
        extraction_result = await self.perform_extraction(
            item=article_data,
            result_schema=result_schema,
            extraction_instructions=extraction_instructions,
            schema_key=f"focused_entity_relationships_{hash(tuple(sorted(focus_entities)))}"
        )
        
        if extraction_result.error:
            raise ValueError(f"Focused entity extraction failed: {extraction_result.error}")
        
        # Transform focused extraction result to standard EntityRelationshipAnalysis format
        extraction_data = extraction_result.extraction.copy()
        
        # Combine focus_entities and related_entities into entities list
        all_entities = []
        if "focus_entities" in extraction_data:
            all_entities.extend(extraction_data["focus_entities"])
        if "related_entities" in extraction_data:
            all_entities.extend(extraction_data["related_entities"])
        
        # Create standard EntityRelationshipAnalysis format
        analysis_data = {
            "pattern_complexity": extraction_data.get("pattern_complexity", "SIMPLE"),
            "entities": all_entities,
            "relationships": extraction_data.get("relationships", []),
            "complexity_justification": extraction_data.get("complexity_justification"),
            "clinical_significance": extraction_data.get("clinical_significance"), 
            "key_findings": extraction_data.get("key_findings", [])
        }
        
        analysis = EntityRelationshipAnalysis(**analysis_data)
        
        return EntityExtractionResponse(
            article_id=article_id,
            analysis=analysis,
            extraction_metadata={
                "extraction_timestamp": extraction_result.extraction_timestamp,
                "confidence_score": extraction_result.confidence_score,
                "focus_entities": focus_entities,
                "extraction_type": "focused_entity_relationships"
            }
        )
    
    def _build_focused_entity_extraction_instructions(self, focus_entities: List[str]) -> str:
        """Build extraction instructions for focused entity relationship analysis"""
        
        focus_entities_str = ", ".join(f'"{entity}"' for entity in focus_entities)
        
        instructions = f"""
# Instructions for Focused Entity Relationship Analysis

## Objective:
Analyze the research article to identify relationships specifically focused on these key entities: {focus_entities_str}

## Primary Task:
1. **Identify Focus Entities**: Find mentions of the specified focus entities in the text
2. **Map Entity Network**: Build a relationship graph centered around these focus entities
3. **Discover Connections**: Identify how these focus entities relate to each other and to other relevant entities

## Step-by-Step Process:

### 1. Extract Focus Entities
For each of the specified focus entities ({focus_entities_str}):
- Search for direct mentions and synonyms in the text
- Classify the entity type (medical_condition, biological_factor, environmental_factor, etc.)
- Document all text passages where the entity is mentioned
- Assign a relevance score (0-1) based on how prominently it's discussed

### 2. Identify Related Entities
Find other entities that:
- Are directly connected to any focus entity
- Are mentioned in the same context as focus entities
- Play a role in mechanisms involving focus entities
- Are outcomes or consequences of focus entities

### 3. Map Focus-Centered Relationships
Prioritize relationships that:
- **Direct Focus-Focus**: Connect one focus entity to another
- **Focus-Related**: Connect a focus entity to a related entity
- **Supporting**: Help explain the context around focus entities

For each relationship, specify:
- Type (causal, associative, therapeutic, etc.)
- Strength of evidence (strong/moderate/weak)
- Whether it involves at least one focus entity
- Supporting textual evidence

### 4. Analyze Network Structure
Determine:
- **Central Nodes**: Which entities (focus or related) are most connected
- **Key Pathways**: Important chains of relationships involving focus entities
- **Network Density**: How interconnected the focus entities are with each other and related entities

### 5. Generate Focus-Specific Insights
For each focus entity, provide:
- Key insight about its role in the research
- How it connects to other focus entities
- Clinical or research significance
- Supporting evidence from the text

## Analysis Requirements:
- Prioritize information directly related to the specified focus entities
- Map the relationship network with focus entities as central nodes
- Provide insights specific to how the focus entities interact and relate
- Classify complexity based on the interconnectedness of focus entities
- Highlight key findings that involve the focus entities

## Output Focus:
The analysis should primarily reveal how {focus_entities_str} relate to each other and to the broader research context, creating a focused relationship graph that answers questions about these specific entities.
"""
        
        return instructions

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

    async def extract_article_archetype(self, article_id: str, title: str, abstract: str, full_text: Optional[str] = None) -> ArticleArchetype:
        """
        Stage 1: Extract a natural-language study archetype from the article text.
        Returns an ArticleArchetype object with archetype text and optional study type.
        """
        article_data = {
            "id": article_id,
            "title": title,
            "abstract": abstract,
            "full_text": full_text or ""
        }

        # Minimal result schema expecting plain NL archetype (plus optional classification)
        result_schema = {
            "type": "object",
            "properties": {
                "archetype": {"type": "string", "description": "Plain NL archetype of the study"},
                "study_type": {
                    "type": "string",
                    "description": "High-level study category (e.g., Intervention, Observational, Diagnostic, Prognostic, Cross-sectional, Systematic Review/Meta-analysis)"
                }
            },
            "required": ["archetype"]
        }

        instructions = self._build_archetype_instructions()
        prompt_caller = self._get_prompt_caller("article_archetype", result_schema)
        extraction = await prompt_caller.invoke_extraction(
            source_item=article_data,
            extraction_instructions=instructions
        )
        
        # Convert extraction dict to ArticleArchetype model
        return ArticleArchetype(
            archetype=extraction.get("archetype", ""),
            study_type=extraction.get("study_type")
        )

    async def extract_er_graph_from_archetype(self, article_id: str, archetype_text: str, study_type: Optional[str] = None) -> EntityExtractionResponse:
        """
        Stage 2: Given a natural-language archetype, generate an entity-relationship graph.
        Returns standard EntityExtractionResponse.
        """
        # Build a synthetic source item that contains only the archetype
        source_item = {
            "article_id": article_id,
            "archetype": archetype_text,
            "study_type": study_type
        }

        # Reuse standard ER analysis schema
        result_schema = {
            "type": "object",
            "properties": {
                "pattern_complexity": {"type": "string", "enum": ["SIMPLE", "COMPLEX"]},
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "role": {"type": "string", "description": "Archetype role (population, condition, intervention, comparator, exposure, outcome, test, time, factor)"},
                            "type": {
                                "type": "string",
                                "enum": [
                                    "medical_condition", "biological_factor", "intervention",
                                    "patient_characteristic", "psychological_factor", "outcome",
                                    "gene", "protein", "pathway", "drug", "environmental_factor",
                                    "animal_model", "exposure", "other"
                                ]
                            },
                            "description": {"type": "string"},
                            "mentions": {"type": "array", "items": {"type": "string"}}
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
                                "enum": [
                                    "causal", "therapeutic", "associative", "temporal",
                                    "inhibitory", "regulatory", "interactive", "paradoxical",
                                    "correlative", "predictive"
                                ]
                            },
                            "description": {"type": "string"},
                            "evidence": {"type": "string"},
                            "strength": {"type": "string", "enum": ["strong", "moderate", "weak"]}
                        },
                        "required": ["source_entity_id", "target_entity_id", "type", "description"]
                    }
                },
                "complexity_justification": {"type": "string"},
                "clinical_significance": {"type": "string"},
                "key_findings": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["pattern_complexity", "entities", "relationships"]
        }

        instructions = self._build_er_from_archetype_instructions(study_type)
        extraction_result = await self.perform_extraction(
            item=source_item,
            result_schema=result_schema,
            extraction_instructions=instructions,
            schema_key="er_graph_from_archetype"
        )

        if extraction_result.error:
            raise ValueError(f"ER graph from archetype failed: {extraction_result.error}")

        # Sanitize entity types: map unknown types to 'other' to satisfy enum validation
        allowed_entity_types = {
            "medical_condition", "biological_factor", "intervention",
            "patient_characteristic", "psychological_factor", "outcome",
            "gene", "protein", "pathway", "drug", "environmental_factor",
            "animal_model", "exposure", "other"
        }
        cleaned = extraction_result.extraction.copy()
        try:
            for entity in cleaned.get("entities", []) or []:
                etype = (entity.get("type") or "").strip()
                if etype not in allowed_entity_types:
                    entity["type"] = "other"
        except Exception:
            # If anything unexpected, fall back to raw
            pass

        analysis = EntityRelationshipAnalysis(**cleaned)
        return EntityExtractionResponse(
            article_id=article_id,
            analysis=analysis,
            extraction_metadata={
                "extraction_timestamp": extraction_result.extraction_timestamp,
                "confidence_score": extraction_result.confidence_score,
                "extraction_type": "archetype_to_er_graph"
            }
        )

    def _build_archetype_instructions(self) -> str:
        """Build instructions for generating a plain-language study archetype from article text."""
        return (
            """
# Task: Produce a plain-language study archetype that best matches the article.

Use a compact, natural sentence or two that instantiates a canonical archetype template. Do not include boilerplate beyond the archetype itself.

Canonical archetype families and examples:

Intervention Studies:
- Population P was treated for condition C with intervention I to study outcome O
- Intervention I was compared to control C in population P to measure outcome O
- Population P received intervention I versus comparator C to assess efficacy for outcome O

Observational Studies:
- Population P with exposure E was observed for outcome O compared to unexposed controls
- Population P was followed over time T to identify factors F associated with outcome O
- Cases with condition C were compared to controls without C to identify risk factors F

Diagnostic/Screening Studies:
- Test T was evaluated in population P to diagnose condition C compared to reference standard R
- Screening method S was assessed in population P to detect condition C

Prognostic Studies:
- Population P with condition C was followed to identify predictors F of outcome O
- Patients with disease D were monitored over time T to determine factors F affecting prognosis P

Cross-sectional Studies:
- Population P was surveyed to measure prevalence of condition C and associations with factors F
- Sample S was assessed at timepoint T to examine relationship between exposure E and outcome O

Systematic Reviews/Meta-analyses:
- Studies examining intervention I for condition C were systematically reviewed to assess outcome O
- Data from N studies of treatment T versus control C were pooled to evaluate effect on outcome O

Output fields:
- archetype: the instantiated natural-language archetype succinctly describing the study
- study_type: one of {Intervention, Observational, Diagnostic/Screening, Prognostic, Cross-sectional, Systematic Review/Meta-analysis}
"""
        )

    def _build_er_from_archetype_instructions(self, study_type: Optional[str]) -> str:
        """Build instructions for converting an archetype sentence into an ER graph with role mapping and study-type rules."""
        study_rules = ""
        if study_type:
            st = study_type.lower()
            if "intervention" in st:
                study_rules = (
                    "- Create entities with roles: population, condition, intervention, comparator (if present), outcome.\n"
                    "- Required edges: intervention therapeutic -> outcome. If comparator present, add interactive/regulatory edges comparing intervention vs comparator.\n"
                )
            elif "observational" in st:
                study_rules = (
                    "- Create entities with roles: population, exposure, outcome, factors (as needed).\n"
                    "- Primary edges: exposure associative/causal -> outcome; factors associative/predictive -> outcome.\n"
                )
            elif "diagnostic" in st or "screening" in st:
                study_rules = (
                    "- Create entities with roles: population, test, condition, reference_standard (if present), outcome (diagnostic accuracy).\n"
                    "- Edges: test predictive -> condition; reference_standard regulatory -> test (as benchmark).\n"
                )
            elif "prognostic" in st:
                study_rules = (
                    "- Roles: population, condition, factors, outcome, time.\n"
                    "- Edges: factors predictive -> outcome; condition associative -> outcome; time temporal -> outcome.\n"
                )
            elif "cross" in st:
                study_rules = (
                    "- Roles: population, exposure, factors, outcome (prevalence or association).\n"
                    "- Edges: exposure associative -> outcome; factors associative -> outcome.\n"
                )
            elif "systematic" in st or "meta" in st:
                study_rules = (
                    "- Roles: intervention, comparator, condition, outcome; optionally number_of_studies.\n"
                    "- Edges: intervention therapeutic -> outcome; comparator interactive -> outcome; include summary relationships describing pooled effects.\n"
                )

        return (
            f"""
# Task: Convert the given study archetype into an entity-relationship graph.

Input:
- archetype: A natural-language study archetype sentence.
- study_type: {study_type or 'unknown'}

Steps:
1) Identify entities and assign an archetype role to each entity using this set: population, condition, intervention, comparator, exposure, outcome, test, time, factor. If a role is not applicable, omit it. If multiple, create multiple entities with the same role.
2) Map each entity to a standard type (medical_condition, biological_factor, intervention, patient_characteristic, psychological_factor, outcome, gene, protein, pathway, drug, environmental_factor, animal_model, exposure, other).
3) Create relationships consistent with the archetype semantics. Prefer these rules by study type:\n{study_rules}
4) Use stable IDs like entity_population, entity_condition, entity_intervention, etc. If multiple of the same role, suffix with numbers (e.g., entity_factor_1).
5) Provide a brief description for entities and relationships, and include evidence snippets when available from the archetype. If evidence is not present, omit.
6) Classify pattern_complexity as SIMPLE unless the archetype implies multiple interacting factors (then COMPLEX).

Validation:
- Do not invent entities that contradict the archetype.
- If a role is implied but unnamed, create a concise placeholder name (e.g., "Comparator Control").
- Ensure edge directions follow semantics (e.g., intervention -> outcome).

Output must strictly conform to the provided JSON schema.
"""
        )


# Singleton instance
_extraction_service = None

def get_extraction_service() -> ExtractionService:
    """Get the singleton extraction service instance"""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service