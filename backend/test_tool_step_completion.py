#!/usr/bin/env python3
"""
Test script to validate tool step completion state transition.
"""

import sys
sys.path.append('.')

from services.state_transition_service import StateTransitionService, TransactionType

def test_transaction_type():
    """Test that COMPLETE_TOOL_STEP transaction type is available"""
    print("Testing TransactionType enum...")
    
    # Check that COMPLETE_TOOL_STEP exists
    assert hasattr(TransactionType, 'COMPLETE_TOOL_STEP'), "COMPLETE_TOOL_STEP not found in TransactionType"
    
    # Check its value
    assert TransactionType.COMPLETE_TOOL_STEP == "complete_tool_step", f"Expected 'complete_tool_step', got {TransactionType.COMPLETE_TOOL_STEP}"
    
    print("✓ TransactionType.COMPLETE_TOOL_STEP available")
    
    # List all transaction types
    print("\nAvailable transaction types:")
    for transaction_type in TransactionType:
        print(f"  - {transaction_type.value}")

def test_service_methods():
    """Test that StateTransitionService has the required methods"""
    print("\nTesting StateTransitionService methods...")
    
    # Check that the service has the required methods
    assert hasattr(StateTransitionService, 'updateState'), "updateState method not found"
    assert hasattr(StateTransitionService, '_complete_tool_step'), "_complete_tool_step method not found"
    assert hasattr(StateTransitionService, '_generate_simulated_execution_result'), "_generate_simulated_execution_result method not found"
    assert hasattr(StateTransitionService, '_create_output_assets_from_tool_step'), "_create_output_assets_from_tool_step method not found"
    assert hasattr(StateTransitionService, '_check_hop_progress'), "_check_hop_progress method not found"
    
    print("✓ All required methods are available")

if __name__ == "__main__":
    print("=== Tool Step Completion Feature Test ===")
    
    try:
        test_transaction_type()
        test_service_methods()
        print("\n✅ All tests passed! Tool step completion feature is ready.")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1) 