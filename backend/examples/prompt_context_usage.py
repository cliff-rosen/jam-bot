"""
Example usage of the new Prompt Context Mapper system.

This file demonstrates how to use the comprehensive mapping system for converting
internal entities (missions, hops, assets) to prompt-suitable formats.
"""

from typing import Dict, Any, List
from schemas.workflow import Mission, Hop, ExecutionStatus, HopStatus
from schemas.asset import Asset, AssetStatus
from utils.prompt_context_mapper import PromptContextType, create_prompt_context, format_context_for_prompt
from utils.message_formatter import format_mission_with_context

def example_basic_usage():
    """Example of basic usage of the prompt context mapper"""
    
    # Create a sample mission (this would normally come from your application)
    mission = create_sample_mission()
    current_hop = create_sample_hop()
    
    # Create context for mission definition
    context = create_prompt_context(
        context_type=PromptContextType.MISSION_DEFINITION,
        mission=mission,
        current_hop=current_hop
    )
    
    print("=== Mission Definition Context ===")
    print(f"Context Type: {context.context_type}")
    print(f"Mission Name: {context.mission_summary['name']}")
    print(f"Available Assets: {len(context.available_assets)}")
    print(f"Asset Categories: {list(context.asset_categories.keys())}")
    print(f"Completed Hops: {len(context.completed_hops)}")
    print(f"Metadata: {context.metadata}")
    
    # Format for prompt variables
    formatted = format_context_for_prompt(context, include_categories=True, include_metadata=True)
    print(f"\nFormatted Mission: {formatted['mission'][:100]}...")
    print(f"Formatted Assets: {formatted['available_assets'][:100]}...")

def example_hop_design_context():
    """Example of creating context for hop design"""
    
    mission = create_sample_mission()
    
    # Create context for hop design
    context = create_prompt_context(
        context_type=PromptContextType.HOP_DESIGN,
        mission=mission,
        available_tools=["web_search", "email_reader", "file_processor"]
    )
    
    print("\n=== Hop Design Context ===")
    print(f"Mission Progress: {context.metadata['mission_progress']:.1%}")
    print(f"Ready Assets: {len(context.asset_categories['ready'])}")
    print(f"Pending Assets: {len(context.asset_categories['pending'])}")
    
    # Show categorized assets
    for category, assets in context.asset_categories.items():
        if assets:
            print(f"\n{category.upper()}:")
            for asset in assets[:3]:  # Show first 3
                print(f"  - {asset['name']} ({asset['type']})")

def example_hop_implementation_context():
    """Example of creating context for hop implementation"""
    
    mission = create_sample_mission()
    current_hop = create_sample_hop()
    
    # Create context for hop implementation
    context = create_prompt_context(
        context_type=PromptContextType.HOP_IMPLEMENTATION,
        mission=mission,
        current_hop=current_hop,
        available_tools=["web_search", "email_reader"]
    )
    
    print("\n=== Hop Implementation Context ===")
    print(f"Current Hop: {context.current_hop['name']}")
    print(f"Hop Status: {context.current_hop['status']}")
    print(f"Available Assets in Hop: {len(context.available_assets)}")
    print(f"Hop Progress: {context.metadata['hop_progress']:.1%}")

def example_legacy_compatibility():
    """Example of using the legacy compatibility functions"""
    
    mission = create_sample_mission()
    current_hop = create_sample_hop()
    
    # Use legacy function that internally uses the new system
    formatted = format_mission_with_context(
        mission=mission,
        context_type="hop_design",
        current_hop=current_hop
    )
    
    print("\n=== Legacy Compatibility ===")
    print(f"Mission: {formatted['mission'][:100]}...")
    print(f"Available Assets: {formatted['available_assets'][:100]}...")
    print(f"Completed Hops: {formatted['completed_hops']}")

def example_advanced_usage():
    """Example of advanced usage with custom asset categorization"""
    
    mission = create_sample_mission()
    
    # Create context with custom parameters
    context = create_prompt_context(
        context_type=PromptContextType.MISSION_REVIEW,
        mission=mission,
        include_asset_history=True,
        include_performance_metrics=True
    )
    
    print("\n=== Advanced Usage ===")
    print(f"Total Assets: {context.metadata['total_assets']}")
    print(f"Mission Status: {context.metadata['mission_status']}")
    print(f"Completed Hops: {context.metadata['completed_hops']}")
    
    # Access structured data directly
    ready_assets = context.asset_categories['ready']
    input_assets = context.asset_categories['inputs']
    
    print(f"\nReady Assets: {len(ready_assets)}")
    print(f"Input Assets: {len(input_assets)}")

def create_sample_mission() -> Mission:
    """Create a sample mission for demonstration purposes"""
    # This is a simplified example - in practice, you'd use your actual Mission model
    mission_dict = {
        "id": "mission_123",
        "name": "Email Analysis Mission",
        "description": "Analyze email content and extract key insights",
        "goal": "Process emails and generate summary reports",
        "success_criteria": ["All emails processed", "Summary report generated"],
        "inputs": [
            {"id": "input_1", "name": "Email Credentials", "description": "OAuth credentials for email access", "type": "config"},
            {"id": "input_2", "name": "Analysis Parameters", "description": "Configuration for analysis", "type": "object"}
        ],
        "outputs": [
            {"id": "output_1", "name": "Email Summary", "description": "Summary of analyzed emails", "type": "markdown"},
            {"id": "output_2", "name": "Insights Report", "description": "Key insights from analysis", "type": "markdown"}
        ],
        "mission_state": {
            "input_1": create_sample_asset("Email Credentials", "config", AssetStatus.READY),
            "input_2": create_sample_asset("Analysis Parameters", "object", AssetStatus.READY),
            "intermediate_1": create_sample_asset("Raw Emails", "email", AssetStatus.READY),
            "intermediate_2": create_sample_asset("Processed Data", "object", AssetStatus.PENDING),
        },
        "hop_history": [],
        "current_hop": None,
        "status": ExecutionStatus.PENDING,
        "mission_status": "PENDING"
    }
    
    # Convert to Mission object (simplified)
    return Mission(**mission_dict)

def create_sample_hop() -> Hop:
    """Create a sample hop for demonstration purposes"""
    hop_dict = {
        "id": "hop_123",
        "name": "Email Processing",
        "description": "Process and analyze email content",
        "input_mapping": {"emails": "intermediate_1"},
        "output_mapping": {"processed_data": "intermediate_2"},
        "hop_state": {
            "emails": create_sample_asset("Raw Emails", "email", AssetStatus.READY),
            "processed_data": create_sample_asset("Processed Data", "object", AssetStatus.PENDING),
        },
        "tool_steps": [],
        "status": HopStatus.HOP_READY_TO_EXECUTE,
        "is_final": False,
        "is_resolved": False
    }
    
    # Convert to Hop object (simplified)
    return Hop(**hop_dict)

def create_sample_asset(name: str, asset_type: str, status: AssetStatus) -> Asset:
    """Create a sample asset for demonstration purposes"""
    asset_dict = {
        "id": f"asset_{name.lower().replace(' ', '_')}",
        "name": name,
        "description": f"Sample {name} asset",
        "schema_definition": {"type": asset_type},
        "value": f"Sample value for {name}",
        "status": status,
        "role": "intermediate",
        "is_collection": False,
        "collection_type": None,
        "subtype": None,
        "asset_metadata": {}
    }
    
    # Convert to Asset object (simplified)
    return Asset(**asset_dict)

if __name__ == "__main__":
    print("Prompt Context Mapper Examples")
    print("=" * 50)
    
    example_basic_usage()
    example_hop_design_context()
    example_hop_implementation_context()
    example_legacy_compatibility()
    example_advanced_usage()
    
    print("\n" + "=" * 50)
    print("Examples completed!") 