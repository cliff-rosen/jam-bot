#!/usr/bin/env python3
"""
Simple test script for email search tool stubbing.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set environment variables for stubbing
os.environ['TOOL_STUBBING_ENABLED'] = 'true'
os.environ['TOOL_STUBBING_MODE'] = 'all'
os.environ['TOOL_STUBBING_DELAY_MS'] = '100'  # Short delay for testing
os.environ['TOOL_STUBBING_FAILURE_RATE'] = '0.0'

async def test_email_search_stubbing():
    """Test email search tool with stubbing enabled."""
    print("🚀 Testing Email Search Tool Stubbing")
    print("=" * 40)
    
    try:
        # Import after setting environment variables
        from tools.tool_registry import refresh_tool_registry, get_tool_definition
        from schemas.tool_handler_schema import ToolHandlerInput
        from tools.tool_stubbing import ToolStubbing
        
        # Refresh tool registry to load stub configurations
        print("📚 Loading tools registry...")
        refresh_tool_registry()
        
        # Get the email search tool
        email_tool = get_tool_definition("email_search")
        if not email_tool:
            print("❌ Email search tool not found in registry")
            return False
        
        print(f"✅ Email search tool loaded: {email_tool.name}")
        print(f"✅ Tool is stubbable: {email_tool.is_stubbable()}")
        
        if email_tool.stub_config:
            print(f"✅ Stub config found with {len(email_tool.stub_config.sample_responses)} scenarios:")
            for response in email_tool.stub_config.sample_responses:
                print(f"   - {response.scenario}: {'ERROR' if response.is_error else 'SUCCESS'}")
        
        # Create test input
        test_input = ToolHandlerInput(
            params={
                "query": "AI newsletter test",
                "max_results": 5,
                "label_ids": ["INBOX"],
                "include_spam_trash": False
            },
            resource_configs={
                "gmail": {
                    "access_token": "test_token",
                    "refresh_token": "test_refresh",
                    "token_expires_at": "2024-12-31T23:59:59Z"
                }
            }
        )
        
        print(f"\n🧪 Testing stubbing behavior...")
        
        # Check if tool should be stubbed
        should_stub = ToolStubbing.should_stub_tool(email_tool)
        print(f"Should stub: {should_stub}")
        
        if should_stub:
            # Get stub response
            print("⏳ Getting stub response...")
            response = await ToolStubbing.get_stub_response(email_tool, test_input)
            print(f"✅ Stub response received!")
            
            # Check response structure
            if response.get("_stubbed"):
                print(f"✅ Response is marked as stubbed")
                print(f"📋 Scenario used: {response.get('_scenario')}")
            
            # Validate response structure
            outputs = response.get("outputs", {})
            if "emails" in outputs and "count" in outputs:
                email_count = len(outputs["emails"])
                reported_count = outputs["count"]
                print(f"✅ Response structure valid: {email_count} emails, count={reported_count}")
                
                # Show first email if available
                if outputs["emails"]:
                    first_email = outputs["emails"][0]
                    print(f"📧 First email: {first_email.get('subject', 'No subject')}")
                    print(f"   From: {first_email.get('from', 'Unknown')}")
                    print(f"   Query in snippet: {'AI newsletter test' in first_email.get('snippet', '')}")
            else:
                print(f"❌ Response structure invalid: missing emails or count")
                return False
        else:
            print(f"❌ Tool should be stubbed but isn't")
            return False
        
        print("\n🎉 Email search stubbing test PASSED!")
        return True
        
    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test runner."""
    success = await test_email_search_stubbing()
    if success:
        print("\n✅ All tests passed! Stubbing is working correctly.")
        return 0
    else:
        print("\n❌ Tests failed. Check output above.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 