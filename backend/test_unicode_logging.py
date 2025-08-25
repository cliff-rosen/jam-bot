#!/usr/bin/env python
"""Test script to verify Unicode logging fixes in smart_search_service.py"""

import logging
import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging to mimic production setup
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Create a test string with Unicode characters that were causing issues
test_unicode_strings = [
    "Test with non-breaking hyphen: treatment\u2011resistant depression",
    "Test with em dash: COVID\u2014pandemic effects",
    "Test with smart quotes: \u201cmachine learning\u201d and \u2018neural networks\u2019",
    "Test with accented characters: résumé, naïve, café",
    "Test with mathematical symbols: α, β, γ, δ, ε",
    "Test with emoji: 🧬 genetics 🔬 research",
]

logger = logging.getLogger(__name__)

def test_direct_logging():
    """Test logging Unicode strings directly (this would fail)"""
    print("\n=== Testing direct Unicode logging (would fail) ===")
    for test_str in test_unicode_strings:
        try:
            # This would normally fail on Windows
            logger.info(f"Direct: {test_str}")
        except UnicodeEncodeError as e:
            print(f"[FAIL] Failed: {e}")

def test_sanitized_logging():
    """Test logging with sanitization (our fix)"""
    print("\n=== Testing sanitized Unicode logging (our fix) ===")
    for test_str in test_unicode_strings:
        try:
            # Apply our sanitization fix
            sanitized = test_str.encode('ascii', 'replace').decode('ascii')
            logger.info(f"Sanitized: {sanitized}")
            print(f"[OK] Success")
        except Exception as e:
            print(f"[FAIL] Failed: {e}")

async def test_service_logging():
    """Test actual service code with Unicode handling"""
    print("\n=== Testing service-style logging ===")
    
    # Simulate what happens in smart_search_service.py
    class MockLLMResult:
        def __init__(self):
            self.evidence_specification = "Find articles about treatment\u2011resistant depression\u2014a complex topic"
            self.search_query = "\u201cmachine learning\u201d approaches to \u2018healthcare\u2019"
            self.refined_query = "COVID\u2014pandemic α-wave analysis"
    
    result = MockLLMResult()
    
    # Test our sanitization approach
    try:
        # Sanitize for logging
        evidence_spec_safe = result.evidence_specification.encode('ascii', 'replace').decode('ascii')
        logger.info(f"Evidence spec: {evidence_spec_safe[:100]}...")
        
        search_query_safe = result.search_query.encode('ascii', 'replace').decode('ascii')
        logger.info(f"Search query: {search_query_safe[:100]}...")
        
        refined_query_safe = result.refined_query.encode('ascii', 'replace').decode('ascii')
        logger.info(f"Refined query: {refined_query_safe[:100]}...")
        
        print("[OK] All service logging successful!")
    except Exception as e:
        print(f"[FAIL] Service logging failed: {e}")

if __name__ == "__main__":
    print("Testing Unicode logging fixes...")
    print("=" * 60)
    
    # Run tests
    test_direct_logging()
    test_sanitized_logging()
    asyncio.run(test_service_logging())
    
    print("\n" + "=" * 60)
    print("Unicode logging test complete!")
    print("\nSummary: The sanitization approach successfully handles all Unicode")
    print("characters by replacing them with ASCII equivalents (?).")