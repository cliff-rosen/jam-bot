from typing import Dict, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session

from models import ToolStep as ToolStepModel, ToolExecutionStatus

from services.asset_service import AssetService
from services.asset_mapping_service import AssetMappingService
from services.tool_step_service import ToolStepService
from services.state_transition_service import StateTransitionService, TransactionType

from schemas.workflow import ToolStep as ToolStepSchema
from schemas.asset import Asset
from schemas.tool_handler_schema import ToolExecutionInput, ToolExecutionResult
from schemas.schema_utils import create_typed_response

from tools.tool_registry import get_tool_definition
from tools.tool_stubbing import ToolStubbing

class ToolExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.asset_service = AssetService(db)
        self.asset_mapping_service = AssetMappingService(db)
        self.tool_step_service = ToolStepService(db)
        self.state_transition_service = StateTransitionService(db)

    async def execute_tool_step(
        self,
        tool_step_id: str,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Execute a tool step.
        
        1. Get tool step from database
        2. Resolve asset context from hop/mission scope  
        3. Execute the tool using existing tool_execution logic
        4. Delegate state management to StateTransitionService
        5. Return comprehensive results
        """
        try:
            # 1. Get tool step from database
            tool_step_schema = await self.tool_step_service.get_tool_step(tool_step_id, user_id)
            
            if not tool_step_schema:
                raise Exception(f"Tool step {tool_step_id} not found")
            
            # 2. Mark tool step as executing
            await self.tool_step_service.update_tool_step_status(
                tool_step_id, 
                user_id, 
                ToolExecutionStatus.EXECUTING
            )
            
            # 3. Resolve asset context from hop scope
            asset_context = await self._resolve_asset_context(tool_step_schema.hop_id, user_id)
            
            # 4. Execute the tool using internal methods
            tool_result = await self._execute_tool(
                step=tool_step_schema,
                asset_context=asset_context,
                user_id=user_id
            )
            
            # 5. Use StateTransitionService to handle all state updates
            transition_result = await self.state_transition_service.updateState(
                TransactionType.COMPLETE_TOOL_STEP,
                {
                    'tool_step_id': tool_step_id,
                    'user_id': user_id,
                    'execution_result': tool_result
                }
            )
            
            # 6. Return comprehensive result
            return {
                "success": transition_result.success,
                "tool_step_id": tool_step_id,
                "tool_result": tool_result,
                "state_transition": transition_result.to_dict(),
                "assets_created": transition_result.metadata.get('assets_created', []),
                "hop_completed": transition_result.metadata.get('hop_completed', False),
                "mission_completed": transition_result.metadata.get('mission_completed', False),
                "hop_id": tool_step_schema.hop_id
            }
            
        except Exception as e:
            # Mark tool step as failed using tool step service
            try:
                await self.tool_step_service.update_tool_step_status(
                    tool_step_id,
                    user_id,
                    ToolExecutionStatus.FAILED,
                    error_message=str(e)
                )
            except:
                pass  # Don't fail on cleanup failure
            
            raise Exception(f"Tool step execution failed: {str(e)}")

    async def _resolve_asset_context(self, hop_id: str, user_id: int) -> Dict[str, Any]:
        """Resolve asset context - get all assets mapped to the hop regardless of scope."""
        asset_context = {}
        
        # Get all asset IDs mapped to this hop (regardless of their scope)
        hop_asset_mappings = self.asset_mapping_service.get_hop_assets(hop_id)
        
        # Load the actual asset objects
        if hop_asset_mappings:
            asset_ids = list(hop_asset_mappings.keys())
            assets = self.asset_service.get_assets_by_ids(asset_ids, user_id)
            
            for asset in assets:
                asset_context[asset.id] = asset
        
        return asset_context

    async def _execute_tool(
        self,
        step: ToolStepSchema,
        asset_context: Dict[str, Any],
        user_id: int
    ) -> Dict[str, Any]:
        """
        Execute a tool step and return the results with proper canonical type handling.
        """
        print("Starting tool execution")

        # Get tool definition from registry
        tool_def = get_tool_definition(step.tool_id)
        if not tool_def:
            raise Exception(f"Tool {step.tool_id} not found in registry")
        
        # Build tool inputs from parameter mappings
        params = self._map_parameters(step, asset_context)
        
        # Convert Resource objects to dictionaries
        resource_configs = {}
        if step.resource_configs:
            resource_configs = {
                resource_id: resource.model_dump() if hasattr(resource, 'model_dump') else resource
                for resource_id, resource in step.resource_configs.items()
            }
        
        # Create execution input
        execution_input = ToolExecutionInput(
            params=params,
            resource_configs=resource_configs,
            step_id=step.id
        )
        
        try:
            # Check if we should stub this tool execution
            if ToolStubbing.should_stub_tool(tool_def):
                print(f"Stubbing tool {step.tool_id}")
                result = await ToolStubbing.get_stub_response(tool_def, execution_input)
            else:
                # Execute the actual tool
                print(f"Executing tool {step.tool_id}")
                result = await tool_def.execution_handler.handler(execution_input)
            
            print("Tool execution completed")

            # Process results with canonical type handling
            execution_response = self._process_tool_results(result)
            
            # Persist assets to database
            await self._persist_updated_assets(step, asset_context, execution_response, user_id)
                
            return execution_response
                
        except Exception as e:
            print(f"Error executing tool: {e}")
            raise Exception(f"Tool {step.tool_id} execution failed: {str(e)}")

    def _map_parameters(self, step: ToolStepSchema, asset_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build tool inputs from parameter mappings."""
        params = {}
        
        if not step.parameter_mapping:
            return params
            
        for param_name, mapping in step.parameter_mapping.items():
            if mapping.type == "literal":
                params[param_name] = mapping.value
            elif mapping.type == "asset_field":
                asset_id = mapping.state_asset
                
                # Get asset from context (could be Asset object or asset data)
                asset_data = asset_context.get(asset_id)
                if not asset_data:
                    raise Exception(f"Asset {asset_id} not found in asset context")
                
                # Extract value from asset
                if isinstance(asset_data, Asset):
                    value = asset_data.value
                elif isinstance(asset_data, dict) and 'value' in asset_data:
                    value = asset_data['value']
                else:
                    # Assume the asset_data is the value itself
                    value = asset_data
                
                params[param_name] = value
        
        return params

    def _process_tool_results(self, result: Any) -> Dict[str, Any]:
        """Process tool results with canonical type handling."""
        # Handle different result types while preserving canonical types
        if isinstance(result, ToolExecutionResult):
            # New typed result format - use schema utilities for proper handling
            execution_response = create_typed_response(
                success=True,
                outputs=result.outputs,
                metadata=result.metadata
            )
        elif isinstance(result, dict) and "outputs" in result:
            # Legacy result format - handle gracefully
            execution_response = create_typed_response(
                success=True,
                outputs=result["outputs"],
                metadata=result.get("metadata")
            )
        else:
            # Direct result format - treat as outputs
            execution_response = create_typed_response(
                success=True,
                outputs=result,
                metadata=None
            )
        
        return execution_response

    async def _persist_updated_assets(
        self,
        step: ToolStepSchema,
        asset_context: Dict[str, Any],
        execution_response: Dict[str, Any],
        user_id: int
    ) -> None:
        """
        Persist updated assets to the database after successful tool execution.
        """
        try:
            # Extract tool outputs from execution response
            tool_outputs = execution_response.get("outputs", {})
            
            if not step.result_mapping:
                return
            
            # Find assets that were updated by this tool execution
            for result_name, mapping in step.result_mapping.items():
                if mapping.type == "asset_field":
                    asset_id = mapping.state_asset
                    asset_data = asset_context.get(asset_id)
                    
                    # Get the output value from tool execution
                    output_value = tool_outputs.get(result_name)
                    
                    if asset_data and output_value is not None:
                        await self._update_asset_with_output(
                            asset_data, output_value, user_id, step.hop_id
                        )
                        
        except Exception as e:
            print(f"Error persisting assets to database: {e}")
            # Don't fail the tool execution if asset persistence fails

    async def _update_asset_with_output(
        self,
        asset_data: Any,
        output_value: Any,
        user_id: int,
        hop_id: str
    ) -> None:
        """Update or create asset with tool output."""
        try:
            if isinstance(asset_data, Asset):
                asset = asset_data
                
                if asset.status == "PROPOSED":
                    # Create new asset
                    self.asset_service.create_asset(
                        user_id=user_id,
                        name=asset.name,
                        schema_definition=asset.schema_definition.model_dump() if hasattr(asset.schema_definition, 'model_dump') else asset.schema_definition,
                        subtype=asset.subtype,
                        description=asset.description,
                        content=output_value,
                        asset_metadata=asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                        scope_type="hop",
                        scope_id=hop_id
                    )
                    print(f"Created new asset {asset.name} with tool output")
                else:
                    # Update existing asset
                    self.asset_service.update_asset(
                        asset_id=asset.id,
                        user_id=user_id,
                        updates={
                            'content': output_value,
                            'asset_metadata': asset.asset_metadata.model_dump() if asset.asset_metadata else None,
                            'updated_at': datetime.utcnow()
                        }
                    )
                    print(f"Updated existing asset {asset.name} with tool output")
                    
        except Exception as e:
            print(f"Error updating asset: {e}")




 