#!/usr/bin/env python3
"""
Test script to verify the new OutputAssetSpec discriminated union works correctly.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from schemas.lite_models import (
    AssetLite, HopLite, NewAssetOutput, ExistingAssetOutput, 
    OutputAssetSpec, create_hop_from_lite
)
from schemas.base import ValueType

def test_new_asset_output():
    """Test creating a hop with a new asset output"""
    print("Testing NewAssetOutput...")
    
    # Create a new asset output
    new_asset = AssetLite(
        name="processed_data",
        description="Cleaned and processed data from the input source",
        type="object",
        subtype="json",
        is_collection=False,
        role="intermediate"
    )
    
    new_output = NewAssetOutput(asset=new_asset)
    
    # Create a hop with the new asset output
    hop = HopLite(
        name="process_data",
        description="Process and clean the input data",
        inputs=[],
        output=new_output,
        is_final=False,
        rationale="Need to clean the data before analysis"
    )
    
    print(f"Hop output type: {type(hop.output)}")
    print(f"Is NewAssetOutput: {isinstance(hop.output, NewAssetOutput)}")
    print(f"Is ExistingAssetOutput: {isinstance(hop.output, ExistingAssetOutput)}")
    print(f"Asset name: {hop.output.asset.name}")
    print("✓ NewAssetOutput test passed\n")

def test_existing_asset_output():
    """Test creating a hop with an existing asset output"""
    print("Testing ExistingAssetOutput...")
    
    # Create an existing asset output
    existing_output = ExistingAssetOutput(mission_asset_id="existing-asset-123")
    
    # Create a hop with the existing asset output
    hop = HopLite(
        name="finalize_result",
        description="Finalize the result using existing mission asset",
        inputs=[],
        output=existing_output,
        is_final=True,
        rationale="Use the existing mission output asset"
    )
    
    print(f"Hop output type: {type(hop.output)}")
    print(f"Is NewAssetOutput: {isinstance(hop.output, NewAssetOutput)}")
    print(f"Is ExistingAssetOutput: {isinstance(hop.output, ExistingAssetOutput)}")
    print(f"Mission asset ID: {hop.output.mission_asset_id}")
    print("✓ ExistingAssetOutput test passed\n")

def test_union_type():
    """Test that OutputAssetSpec union type works correctly"""
    print("Testing OutputAssetSpec union type...")
    
    # Test that both types are valid for the union
    new_asset = AssetLite(
        name="test_asset",
        description="Test asset",
        type="string"
    )
    
    new_output = NewAssetOutput(asset=new_asset)
    existing_output = ExistingAssetOutput(mission_asset_id="test-id")
    
    # Both should be valid OutputAssetSpec types
    assert isinstance(new_output, OutputAssetSpec)
    assert isinstance(existing_output, OutputAssetSpec)
    
    print("✓ OutputAssetSpec union type test passed\n")

if __name__ == "__main__":
    print("Testing new OutputAssetSpec discriminated union...\n")
    
    test_new_asset_output()
    test_existing_asset_output()
    test_union_type()
    
    print("All tests passed! The new OutputAssetSpec schema is working correctly.") 