#!/usr/bin/env python3
"""
Test script to verify tool stubbing returns ToolHandlerResult format.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variables for stubbing
os.environ['TOOL_STUBBING_ENABLED'] = 'true'
os.environ['TOOL_STUBBING_MODE'] = 'all'

from tools.tool_registry import refresh_tool_registry, get_tool_definition
from schemas.tool_handler_schema import ToolHandlerInput, ToolHandlerResult, ToolParameterValue
from tools.tool_stubbing import ToolStubbing


async def test_stubbing_format():
    """Test that tool stubbing returns ToolHandlerResult format."""
    
    print("Testing Tool Stubbing Format")
    print("=" * 40)
    
    # Load tool registry
    print("Loading tool registry...")
    refresh_tool_registry()
    
    # Get a tool definition
    tool_def = get_tool_definition("extract")
    if not tool_def:
        print("[ERROR] Extract tool not found")
        return False
    
    print(f"Found tool: {tool_def.name}")
    
    # Create test input
    test_input = ToolHandlerInput(
        params={
            "items": ToolParameterValue(
                value=["test1", "test2"],
                parameter_name="items", 
                parameter_type="literal"
            ),
            "extraction_function": ToolParameterValue(
                value="Count characters",
                parameter_name="extraction_function",
                parameter_type="literal"
            )
        }
    )
    
    print("Calling tool stubbing...")
    result = await ToolStubbing.get_stub_response(tool_def, test_input)
    
    # Verify the result format
    print(f"Result type: {type(result)}")
    print(f"Is ToolHandlerResult: {isinstance(result, ToolHandlerResult)}")
    
    if isinstance(result, ToolHandlerResult):
        print("[OK] Stubbing returned ToolHandlerResult format")
        print(f"   Outputs: {result.outputs}")
        print(f"   Metadata: {result.metadata}")
        
        # Check for stubbing metadata
        if result.metadata and result.metadata.get('_stubbed'):
            print("[OK] Stubbing metadata is present")
            print(f"   Scenario: {result.metadata.get('_scenario')}")
            print(f"   Timestamp: {result.metadata.get('_timestamp')}")
        else:
            print("[WARNING] Stubbing metadata not found")
        
        return True
    else:
        print(f"[ERROR] Expected ToolHandlerResult, got {type(result)}")
        return False


async def main():
    """Main test function"""
    success = await test_stubbing_format()
    
    if success:
        print("\n[SUCCESS] Tool stubbing format test passed!")
        return 0
    else:
        print("\n[FAILED] Tool stubbing format test failed!")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)