"""
Pattern-based Entity Graph Configuration

Simple mapping from archetype patterns to graph structures.
Each pattern defines what entities should be extracted and how they connect.
"""

from typing import Dict, List, Tuple
from enum import Enum


class GraphRole(str, Enum):
    """Simplified roles for entities in pattern-based graphs"""
    POPULATION = "population"          # P - the study population
    CONDITION = "condition"           # C - medical condition being treated
    INTERVENTION = "intervention"     # I - treatment/intervention  
    CONTROL = "control"              # Control/comparator group
    OUTCOME = "outcome"              # O - measured outcome
    EXPOSURE = "exposure"            # E - exposure/risk factor
    TEST = "test"                    # T - diagnostic test
    TIME = "time"                    # Time period
    FACTOR = "factor"                # F - risk factor


class ConnectionType(str, Enum):
    """Simple connection types for pattern graphs"""
    RECEIVES = "receives"            # Population receives intervention
    TREATS = "treats"               # Intervention treats condition
    MEASURES = "measures"           # Study measures outcome
    COMPARES_TO = "compares_to"     # Intervention compares to control
    HAS_CONDITION = "has_condition" # Population has condition
    PRODUCES = "produces"           # Intervention produces outcome
    EXPOSES_TO = "exposes_to"      # Population exposed to factor


# Pattern-specific graph templates
PATTERN_GRAPHS = {
    # Clinical intervention patterns
    "1a": {
        "entities": [
            {"role": GraphRole.POPULATION, "extract_from": "Population P"},
            {"role": GraphRole.CONDITION, "extract_from": "condition C"}, 
            {"role": GraphRole.INTERVENTION, "extract_from": "intervention I"},
            {"role": GraphRole.OUTCOME, "extract_from": "outcome O"}
        ],
        "connections": [
            (GraphRole.POPULATION, ConnectionType.HAS_CONDITION, GraphRole.CONDITION),
            (GraphRole.POPULATION, ConnectionType.RECEIVES, GraphRole.INTERVENTION),
            (GraphRole.INTERVENTION, ConnectionType.TREATS, GraphRole.CONDITION),
            (GraphRole.INTERVENTION, ConnectionType.PRODUCES, GraphRole.OUTCOME)
        ]
    },
    
    # Mechanistic intervention patterns
    "1a-mech": {
        "entities": [
            {"role": GraphRole.POPULATION, "extract_from": "Population P"},
            {"role": GraphRole.INTERVENTION, "extract_from": "intervention I"},
            {"role": GraphRole.OUTCOME, "extract_from": "physiological outcome O"}
        ],
        "connections": [
            (GraphRole.POPULATION, ConnectionType.RECEIVES, GraphRole.INTERVENTION),
            (GraphRole.INTERVENTION, ConnectionType.PRODUCES, GraphRole.OUTCOME)
        ]
    },
    
    # Comparative intervention patterns
    "1b": {
        "entities": [
            {"role": GraphRole.INTERVENTION, "extract_from": "Intervention I"},
            {"role": GraphRole.CONTROL, "extract_from": "control C"},
            {"role": GraphRole.POPULATION, "extract_from": "population P"},
            {"role": GraphRole.OUTCOME, "extract_from": "outcome O"}
        ],
        "connections": [
            (GraphRole.POPULATION, ConnectionType.RECEIVES, GraphRole.INTERVENTION),
            (GraphRole.INTERVENTION, ConnectionType.COMPARES_TO, GraphRole.CONTROL),
            (GraphRole.INTERVENTION, ConnectionType.PRODUCES, GraphRole.OUTCOME),
            (GraphRole.CONTROL, ConnectionType.PRODUCES, GraphRole.OUTCOME)
        ]
    },
    
    "1b-mech": {
        "entities": [
            {"role": GraphRole.INTERVENTION, "extract_from": "Intervention I"},
            {"role": GraphRole.CONTROL, "extract_from": "control C"},
            {"role": GraphRole.POPULATION, "extract_from": "healthy population P"},
            {"role": GraphRole.OUTCOME, "extract_from": "physiological response O"}
        ],
        "connections": [
            (GraphRole.POPULATION, ConnectionType.RECEIVES, GraphRole.INTERVENTION),
            (GraphRole.INTERVENTION, ConnectionType.COMPARES_TO, GraphRole.CONTROL),
            (GraphRole.INTERVENTION, ConnectionType.PRODUCES, GraphRole.OUTCOME),
            (GraphRole.CONTROL, ConnectionType.PRODUCES, GraphRole.OUTCOME)
        ]
    },
    
    # Observational patterns
    "2a": {
        "entities": [
            {"role": GraphRole.POPULATION, "extract_from": "Population P"},
            {"role": GraphRole.EXPOSURE, "extract_from": "exposure E"},
            {"role": GraphRole.OUTCOME, "extract_from": "outcome O"},
            {"role": GraphRole.CONTROL, "extract_from": "unexposed controls"}
        ],
        "connections": [
            (GraphRole.POPULATION, ConnectionType.EXPOSES_TO, GraphRole.EXPOSURE),
            (GraphRole.EXPOSURE, ConnectionType.PRODUCES, GraphRole.OUTCOME),
            (GraphRole.POPULATION, ConnectionType.COMPARES_TO, GraphRole.CONTROL)
        ]
    },
    
    # Add more patterns as needed...
}


def get_pattern_graph_template(pattern_id: str) -> Dict:
    """Get the graph template for a specific pattern."""
    return PATTERN_GRAPHS.get(pattern_id, {})


def get_extraction_instructions(pattern_id: str) -> str:
    """Generate extraction instructions for a specific pattern."""
    template = get_pattern_graph_template(pattern_id)
    if not template:
        return "Extract entities and relationships from the archetype text."
    
    entity_instructions = []
    for entity in template["entities"]:
        entity_instructions.append(
            f"- {entity['role'].value}: Extract the specific {entity['extract_from']} mentioned in the archetype"
        )
    
    return f"""
Extract entities from the archetype text according to pattern {pattern_id}:

{chr(10).join(entity_instructions)}

For each entity, provide:
- name: The specific term from the archetype (not the placeholder)
- description: Brief description of what this entity represents in the study
"""