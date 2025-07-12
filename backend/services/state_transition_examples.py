"""
State Transition Service Usage Examples

Simple, unified interface: updateState(transaction_type, data)

All state transitions go through a single method with different transaction types:
- propose_mission, accept_mission
- propose_hop_plan, accept_hop_plan  
- propose_hop_impl, accept_hop_impl
- execute_hop, complete_hop
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from services.state_transition_service import StateTransitionService


class StateTransitionExamples:
    """Examples using the unified updateState interface"""
    
    def __init__(self, db: Session):
        self.db = db
        self.state_service = StateTransitionService(db)
    
    async def propose_mission_example(self, user_id: int, mission_data: Dict[str, Any]):
        """Example: Agent proposes mission"""
        result = await self.state_service.updateState("propose_mission", {
            "user_id": user_id,
            "mission": mission_data
        })
        
        print(f"✅ {result['message']}")
        print(f"   Mission ID: {result['mission_id']}")
        print(f"   Status: {result['status']}")
        
        return result
    
    async def accept_mission_example(self, user_id: int, mission_id: str):
        """Example: User accepts mission"""
        result = await self.state_service.updateState("accept_mission", {
            "user_id": user_id,
            "mission_id": mission_id
        })
        
        print(f"✅ {result['message']}")
        print(f"   Mission Status: {result['status']}")
        
        return result
    
    async def propose_hop_plan_example(self, user_id: int, mission_id: str, hop_data: Dict[str, Any]):
        """Example: Agent proposes hop plan"""
        result = await self.state_service.updateState("propose_hop_plan", {
            "user_id": user_id,
            "mission_id": mission_id,
            "hop": hop_data
        })
        
        print(f"✅ {result['message']}")
        print(f"   Hop ID: {result['hop_id']}")
        print(f"   Status: {result['status']}")
        
        return result
    
    async def accept_hop_plan_example(self, user_id: int, hop_id: str):
        """Example: User accepts hop plan"""
        result = await self.state_service.updateState("accept_hop_plan", {
            "user_id": user_id,
            "hop_id": hop_id
        })
        
        print(f"✅ {result['message']}")
        print(f"   Hop Status: {result['status']}")
        
        return result
    
    async def propose_hop_impl_example(self, user_id: int, hop_id: str, tool_steps: list):
        """Example: Agent proposes hop implementation"""
        result = await self.state_service.updateState("propose_hop_impl", {
            "user_id": user_id,
            "hop_id": hop_id,
            "tool_steps": tool_steps
        })
        
        print(f"✅ {result['message']}")
        print(f"   Tool Steps Created: {result['tool_steps_created']}")
        print(f"   Status: {result['status']}")
        
        return result
    
    async def accept_hop_impl_example(self, user_id: int, hop_id: str):
        """Example: User accepts hop implementation"""
        result = await self.state_service.updateState("accept_hop_impl", {
            "user_id": user_id,
            "hop_id": hop_id
        })
        
        print(f"✅ {result['message']}")
        print(f"   Hop Status: {result['status']}")
        
        return result
    
    async def execute_hop_example(self, user_id: int, hop_id: str):
        """Example: User triggers hop execution"""
        result = await self.state_service.updateState("execute_hop", {
            "user_id": user_id,
            "hop_id": hop_id
        })
        
        print(f"✅ {result['message']}")
        print(f"   Hop Status: {result['status']}")
        
        return result
    
    async def complete_hop_example(self, user_id: int, hop_id: str, execution_result: Dict[str, Any] = None):
        """Example: System completes hop execution"""
        result = await self.state_service.updateState("complete_hop", {
            "user_id": user_id,
            "hop_id": hop_id,
            "execution_result": execution_result
        })
        
        print(f"✅ {result['message']}")
        print(f"   Hop Status: {result['hop_status']}")
        print(f"   Mission Status: {result['mission_status']}")
        
        if result['is_final']:
            print(f"   🎉 Mission completed!")
        else:
            print(f"   ➡️  Ready for next hop")
        
        return result


# Complete workflow example
async def complete_workflow_example(db: Session):
    """Example: Complete mission workflow using unified interface"""
    
    examples = StateTransitionExamples(db)
    user_id = 1
    
    try:
        print("🚀 Complete Mission Workflow Example")
        print("=" * 50)
        
        # 1. Agent proposes mission
        print("\n1. Agent proposes mission")
        mission_result = await examples.propose_mission_example(
            user_id=user_id,
            mission_data={
                "name": "Newsletter Automation",
                "goal": "Create automated newsletter system",
                "description": "Build system to collect content and send newsletters",
                "success_criteria": ["Newsletter system operational", "Content aggregation working"]
            }
        )
        mission_id = mission_result['mission_id']
        
        # 2. User accepts mission
        print("\n2. User accepts mission")
        await examples.accept_mission_example(user_id, mission_id)
        
        # 3. Agent proposes hop plan
        print("\n3. Agent proposes hop plan")
        hop_result = await examples.propose_hop_plan_example(
            user_id=user_id,
            mission_id=mission_id,
            hop_data={
                "name": "Setup Email Integration",
                "description": "Configure email API and content sources",
                "goal": "Enable email processing capabilities",
                "sequence_order": 1,
                "is_final": False
            }
        )
        hop_id = hop_result['hop_id']
        
        # 4. User accepts hop plan
        print("\n4. User accepts hop plan")
        await examples.accept_hop_plan_example(user_id, hop_id)
        
        # 5. Agent proposes implementation
        print("\n5. Agent proposes hop implementation")
        await examples.propose_hop_impl_example(
            user_id=user_id,
            hop_id=hop_id,
            tool_steps=[
                {
                    "tool_id": "email_setup",
                    "name": "Configure Email API",
                    "description": "Set up Gmail API connection",
                    "parameter_mapping": {"credentials": {"type": "literal", "value": "gmail_creds"}},
                    "result_mapping": {"connection": {"type": "asset_field", "state_asset": "email_connection"}}
                },
                {
                    "tool_id": "content_aggregator",
                    "name": "Setup Content Sources",
                    "description": "Configure RSS and content feeds",
                    "parameter_mapping": {"sources": {"type": "literal", "value": ["rss1", "rss2"]}},
                    "result_mapping": {"feeds": {"type": "asset_field", "state_asset": "content_feeds"}}
                }
            ]
        )
        
        # 6. User accepts implementation
        print("\n6. User accepts hop implementation")
        await examples.accept_hop_impl_example(user_id, hop_id)
        
        # 7. User triggers execution
        print("\n7. User triggers hop execution")
        await examples.execute_hop_example(user_id, hop_id)
        
        # 8. System completes hop
        print("\n8. System completes hop")
        await examples.complete_hop_example(
            user_id=user_id,
            hop_id=hop_id,
            execution_result={"status": "success", "assets_created": 2}
        )
        
        print("\n🎯 Workflow completed successfully!")
        print("   - All state transitions handled atomically")
        print("   - Mission ready for next hop")
        print("   - Assets properly promoted")
        
    except Exception as e:
        print(f"\n❌ Workflow failed: {str(e)}")
        raise


# Integration examples
async def integration_examples():
    """Examples of integrating with existing code"""
    
    # Example 1: Chat message handler
    async def handle_chat_message(db: Session, message_type: str, data: Dict[str, Any]):
        """Route chat messages to appropriate state transitions"""
        state_service = StateTransitionService(db)
        
        # Map chat messages to transaction types
        message_to_transaction = {
            "create_mission": "propose_mission",
            "approve_mission": "accept_mission", 
            "create_hop": "propose_hop_plan",
            "approve_hop_plan": "accept_hop_plan",
            "start_implementation": "propose_hop_impl",
            "approve_implementation": "accept_hop_impl",
            "execute_hop": "execute_hop"
        }
        
        transaction_type = message_to_transaction.get(message_type)
        if not transaction_type:
            return {"error": f"Unknown message type: {message_type}"}
        
        try:
            result = await state_service.updateState(transaction_type, data)
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Example 2: API endpoint
    async def state_transition_endpoint(db: Session, transaction_type: str, data: Dict[str, Any]):
        """Simple API endpoint for state transitions"""
        state_service = StateTransitionService(db)
        
        try:
            result = await state_service.updateState(transaction_type, data)
            return {"success": True, **result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Example 3: Agent workflow
    async def agent_propose_and_complete_hop(db: Session, mission_id: str, user_id: int):
        """Agent workflow: propose, implement, and complete hop"""
        state_service = StateTransitionService(db)
        
        # Agent proposes hop plan
        hop_result = await state_service.updateState("propose_hop_plan", {
            "user_id": user_id,
            "mission_id": mission_id,
            "hop": {
                "name": "Agent Generated Hop",
                "description": "AI-generated hop implementation",
                "sequence_order": 1
            }
        })
        
        hop_id = hop_result['hop_id']
        
        # Wait for user approval (in real system)
        # await wait_for_user_approval(hop_id)
        
        # Agent proposes implementation
        impl_result = await state_service.updateState("propose_hop_impl", {
            "user_id": user_id,
            "hop_id": hop_id,
            "tool_steps": [
                {
                    "tool_id": "example_tool",
                    "name": "Execute Example",
                    "description": "Run example tool",
                    "parameter_mapping": {},
                    "result_mapping": {}
                }
            ]
        })
        
        return {"hop_proposed": hop_result, "implementation_proposed": impl_result}
    
    print("🔗 Integration Examples")
    print("=" * 30)
    print("✅ Chat message routing")
    print("✅ Simple API endpoints") 
    print("✅ Agent workflow integration")
    print("✅ Unified error handling")
    print("✅ Single transaction interface")


if __name__ == "__main__":
    print("State Transition Service - Unified Interface Examples")
    print("=" * 60)
    print("\n📋 Available Transaction Types:")
    print("  • propose_mission    - Agent proposes mission")
    print("  • accept_mission     - User accepts mission")
    print("  • propose_hop_plan   - Agent proposes hop plan") 
    print("  • accept_hop_plan    - User accepts hop plan")
    print("  • propose_hop_impl   - Agent proposes implementation")
    print("  • accept_hop_impl    - User accepts implementation")
    print("  • execute_hop        - User triggers execution")
    print("  • complete_hop       - System completes hop")
    print("  • complete_mission   - System completes mission")
    print("\n🎯 Key Benefits:")
    print("  • Single method for all state transitions")
    print("  • Consistent interface across all operations")
    print("  • Atomic transactions with automatic rollback")
    print("  • Simple integration with existing code")
    print("  • Clear transaction types and data contracts") 