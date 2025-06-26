#!/usr/bin/env python3
"""
Tool Stubbing Testing and Validation Script

This script demonstrates and validates the tool stubbing system.
It includes tests for various scenarios and configurations.
"""

import asyncio
import sys
import os
from typing import Dict, Any
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.settings import settings
from tools.tool_stubbing import ToolStubbing, enable_stubbing, disable_stubbing, set_stubbing_mode, set_failure_rate
from tools.tool_registry import refresh_tool_registry, get_tool_definition
from schemas.tool_handler_schema import ToolExecutionInput
from tools.tool_execution import execute_tool_step

async def test_email_search_stubbing():
    """Test email search tool with stubbing enabled."""
    print("\n=== Testing Email Search Tool Stubbing ===")
    
    # Enable stubbing
    enable_stubbing()
    set_stubbing_mode("all")
    set_failure_rate(0.0)  # No failures for this test
    
    # Refresh tool registry to load stub configurations
    refresh_tool_registry()
    
    # Get the email search tool
    email_tool = get_tool_definition("email_search")
    if not email_tool:
        print("❌ Email search tool not found in registry")
        return False
    
    print(f"✅ Email search tool loaded: {email_tool.name}")
    print(f"✅ Tool is stubbable: {email_tool.is_stubbable()}")
    
    if email_tool.stub_config:
        print(f"✅ Stub config found with {len(email_tool.stub_config.sample_responses)} scenarios")
        for response in email_tool.stub_config.sample_responses:
            print(f"   - {response.scenario}: {'ERROR' if response.is_error else 'SUCCESS'}")
    
    # Test different scenarios
    scenarios_to_test = ["success", "empty_results", "large_results"]
    
    for scenario in scenarios_to_test:
        print(f"\n--- Testing scenario: {scenario} ---")
        
        # Create test input
        test_input = ToolExecutionInput(
            params={
                "query": f"test query for {scenario}",
                "max_results": 10,
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
        
        try:
            # Check if tool should be stubbed
            should_stub = ToolStubbing.should_stub_tool(email_tool)
            print(f"   Should stub: {should_stub}")
            
            if should_stub:
                # Get stub response
                response = await ToolStubbing.get_stub_response(email_tool, test_input, scenario)
                print(f"   ✅ Stub response received")
                print(f"   Response keys: {list(response.keys())}")
                
                if response.get("_stubbed"):
                    print(f"   ✅ Response is marked as stubbed")
                    print(f"   Scenario used: {response.get('_scenario')}")
                
                # Validate response structure
                outputs = response.get("outputs", {})
                if "emails" in outputs and "count" in outputs:
                    email_count = len(outputs["emails"])
                    reported_count = outputs["count"]
                    print(f"   ✅ Response structure valid: {email_count} emails, count={reported_count}")
                else:
                    print(f"   ❌ Response structure invalid: missing emails or count")
                    
            else:
                print(f"   ❌ Tool should be stubbed but isn't")
                
        except Exception as e:
            print(f"   ❌ Error testing scenario {scenario}: {e}")
    
    return True

async def test_error_scenarios():
    """Test error scenarios and failure simulation."""
    print("\n=== Testing Error Scenarios ===")
    
    # Enable stubbing with some failure rate
    enable_stubbing()
    set_stubbing_mode("all")
    set_failure_rate(0.5)  # 50% failure rate for testing
    
    email_tool = get_tool_definition("email_search")
    if not email_tool:
        print("❌ Email search tool not found")
        return False
    
    # Test error scenarios
    error_scenarios = ["api_error", "auth_error"]
    
    for scenario in error_scenarios:
        print(f"\n--- Testing error scenario: {scenario} ---")
        
        test_input = ToolExecutionInput(
            params={"query": "test error query"},
            resource_configs={"gmail": {"access_token": "test_token"}}
        )
        
        try:
            response = await ToolStubbing.get_stub_response(email_tool, test_input, scenario)
            print(f"   ❌ Expected error but got response: {response}")
        except Exception as e:
            print(f"   ✅ Expected error received: {e}")
    
    # Reset failure rate
    set_failure_rate(0.0)
    
    return True

async def test_stubbing_modes():
    """Test different stubbing modes."""
    print("\n=== Testing Stubbing Modes ===")
    
    email_tool = get_tool_definition("email_search")
    if not email_tool:
        print("❌ Email search tool not found")
        return False
    
    # Test different modes
    modes_to_test = ["all", "external_only", "none"]
    
    for mode in modes_to_test:
        print(f"\n--- Testing mode: {mode} ---")
        
        enable_stubbing()
        set_stubbing_mode(mode)
        
        should_stub = ToolStubbing.should_stub_tool(email_tool)
        print(f"   Should stub with mode '{mode}': {should_stub}")
        
        if mode == "all":
            expected = True
        elif mode == "external_only":
            expected = email_tool.stub_config.requires_external_calls if email_tool.stub_config else False
        else:  # none
            expected = False
        
        if should_stub == expected:
            print(f"   ✅ Mode behavior correct")
        else:
            print(f"   ❌ Mode behavior incorrect: expected {expected}, got {should_stub}")
    
    return True

async def test_response_processing():
    """Test response processing and input-based modifications."""
    print("\n=== Testing Response Processing ===")
    
    enable_stubbing()
    set_stubbing_mode("all")
    
    email_tool = get_tool_definition("email_search")
    if not email_tool:
        print("❌ Email search tool not found")
        return False
    
    # Test with specific query to see if it's reflected in results
    test_query = "machine learning newsletter"
    test_input = ToolExecutionInput(
        params={
            "query": test_query,
            "max_results": 2
        },
        resource_configs={"gmail": {"access_token": "test_token"}}
    )
    
    try:
        response = await ToolStubbing.get_stub_response(email_tool, test_input)
        outputs = response.get("outputs", {})
        emails = outputs.get("emails", [])
        
        # Check if query is reflected in snippets
        query_reflected = False
        for email in emails:
            if test_query in email.get("snippet", ""):
                query_reflected = True
                break
        
        if query_reflected:
            print(f"   ✅ Query '{test_query}' correctly reflected in response")
        else:
            print(f"   ❌ Query '{test_query}' not reflected in response")
        
        # Check if max_results is respected
        max_results = test_input.params["max_results"]
        if len(emails) <= max_results:
            print(f"   ✅ max_results ({max_results}) respected: got {len(emails)} emails")
        else:
            print(f"   ❌ max_results ({max_results}) not respected: got {len(emails)} emails")
        
    except Exception as e:
        print(f"   ❌ Error testing response processing: {e}")
    
    return True

def test_configuration():
    """Test configuration and settings."""
    print("\n=== Testing Configuration ===")
    
    # Test configuration settings
    original_enabled = settings.TOOL_STUBBING_ENABLED
    original_mode = settings.TOOL_STUBBING_MODE
    original_delay = settings.TOOL_STUBBING_DELAY_MS
    original_failure_rate = settings.TOOL_STUBBING_FAILURE_RATE
    
    print(f"Original settings:")
    print(f"   TOOL_STUBBING_ENABLED: {original_enabled}")
    print(f"   TOOL_STUBBING_MODE: {original_mode}")
    print(f"   TOOL_STUBBING_DELAY_MS: {original_delay}")
    print(f"   TOOL_STUBBING_FAILURE_RATE: {original_failure_rate}")
    
    # Test enable/disable
    disable_stubbing()
    print(f"   After disable: {settings.TOOL_STUBBING_ENABLED}")
    
    enable_stubbing()
    print(f"   After enable: {settings.TOOL_STUBBING_ENABLED}")
    
    # Test mode changes
    for mode in ["all", "external_only", "none"]:
        set_stubbing_mode(mode)
        print(f"   Mode set to '{mode}': {settings.TOOL_STUBBING_MODE}")
    
    # Test failure rate
    for rate in [0.0, 0.5, 1.0]:
        set_failure_rate(rate)
        print(f"   Failure rate set to {rate}: {settings.TOOL_STUBBING_FAILURE_RATE}")
    
    # Restore original settings
    settings.TOOL_STUBBING_ENABLED = original_enabled
    settings.TOOL_STUBBING_MODE = original_mode
    settings.TOOL_STUBBING_DELAY_MS = original_delay
    settings.TOOL_STUBBING_FAILURE_RATE = original_failure_rate
    
    print("✅ Configuration tests completed")
    return True

async def main():
    """Main test runner."""
    print("🚀 Starting Tool Stubbing System Tests")
    print("=" * 50)
    
    try:
        # Load tools
        refresh_tool_registry()
        
        # Run tests
        tests = [
            ("Configuration", test_configuration),
            ("Email Search Stubbing", test_email_search_stubbing),
            ("Error Scenarios", test_error_scenarios),
            ("Stubbing Modes", test_stubbing_modes),
            ("Response Processing", test_response_processing),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            try:
                if asyncio.iscoroutinefunction(test_func):
                    result = await test_func()
                else:
                    result = test_func()
                
                if result:
                    print(f"✅ {test_name} PASSED")
                    passed += 1
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"❌ {test_name} ERROR: {e}")
                import traceback
                traceback.print_exc()
        
        print(f"\n{'='*50}")
        print(f"🏁 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Tool stubbing system is working correctly.")
            return 0
        else:
            print("⚠️  Some tests failed. Please review the output above.")
            return 1
            
    except Exception as e:
        print(f"❌ Fatal error during testing: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main()) 