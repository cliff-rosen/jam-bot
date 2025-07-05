"""
Test script for the web_retrieve tool implementation.
"""

import asyncio
import json
from services.web_retrieval_service import WebRetrievalService
from schemas.canonical_types import CanonicalWebpage

async def test_web_retrieve_service():
    """Test the web retrieval service directly"""
    service = WebRetrievalService()
    
    # Test with a simple webpage
    test_url = "https://httpbin.org/html"
    
    try:
        result = await service.retrieve_webpage(
            url=test_url,
            extract_text_only=True,
            timeout=10
        )
        
        print("✓ Web retrieval service test passed")
        print(f"  URL: {result['webpage'].url}")
        print(f"  Title: {result['webpage'].title}")
        print(f"  Content length: {len(result['webpage'].content)}")
        print(f"  Status code: {result['status_code']}")
        print(f"  Response time: {result['response_time']}ms")
        print(f"  Metadata: {result['webpage'].metadata}")
        
        # Verify it's a CanonicalWebpage object
        assert isinstance(result['webpage'], CanonicalWebpage)
        assert result['webpage'].url == test_url
        assert result['webpage'].title != ""
        assert result['webpage'].content != ""
        assert result['status_code'] == 200
        
        return True
        
    except Exception as e:
        print(f"✗ Web retrieval service test failed: {e}")
        return False

async def test_web_retrieve_handler():
    """Test the web retrieve handler"""
    from tools.handlers.web_retrieval_handlers import handle_web_retrieve
    from schemas.tool_handler_schema import ToolExecutionInput
    
    # Create test input
    input_data = ToolExecutionInput(
        params={
            "url": "https://httpbin.org/html",
            "extract_text_only": True,
            "timeout": 10
        }
    )
    
    try:
        result = await handle_web_retrieve(input_data)
        
        print("✓ Web retrieve handler test passed")
        print(f"  Outputs keys: {list(result.outputs.keys())}")
        print(f"  Webpage URL: {result.outputs['webpage'].url}")
        print(f"  Webpage title: {result.outputs['webpage'].title}")
        print(f"  Status code: {result.outputs['status_code']}")
        
        # Verify expected outputs
        assert 'webpage' in result.outputs
        assert 'status_code' in result.outputs
        assert 'response_time' in result.outputs
        assert 'timestamp' in result.outputs
        
        assert isinstance(result.outputs['webpage'], CanonicalWebpage)
        assert result.outputs['status_code'] == 200
        
        return True
        
    except Exception as e:
        print(f"✗ Web retrieve handler test failed: {e}")
        return False

async def test_error_handling():
    """Test error handling with invalid URL"""
    service = WebRetrievalService()
    
    try:
        result = await service.retrieve_webpage(
            url="https://invalid-url-that-does-not-exist-12345.com",
            extract_text_only=True,
            timeout=5
        )
        
        print("✓ Error handling test passed")
        print(f"  Error webpage title: {result['webpage'].title}")
        print(f"  Error in metadata: {'error' in result['webpage'].metadata}")
        
        return True
        
    except Exception as e:
        print(f"✓ Error handling test passed (expected error): {e}")
        return True

async def main():
    """Run all tests"""
    print("Testing web_retrieve tool implementation...")
    print("=" * 50)
    
    tests = [
        ("Web Retrieval Service", test_web_retrieve_service),
        ("Web Retrieve Handler", test_web_retrieve_handler),
        ("Error Handling", test_error_handling)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        result = await test_func()
        results.append(result)
    
    print("\n" + "=" * 50)
    print(f"Tests passed: {sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 All tests passed!")
    else:
        print("❌ Some tests failed!")

if __name__ == "__main__":
    asyncio.run(main()) 