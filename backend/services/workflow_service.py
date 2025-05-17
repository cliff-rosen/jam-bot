from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4
import json

from database import get_db
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError

from models import Workflow, WorkflowStep, WorkflowVariable, Tool, PromptTemplate, File
from schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowStepCreate,
    WorkflowVariableCreate, WorkflowExecuteRequest,
    WorkflowResponse, WorkflowStepResponse, WorkflowVariableResponse,
    ToolResponse, ToolSignature, ParameterSchema, OutputSchema, SchemaValue,
    WorkflowExecuteResponse, Variable, VariableType, EvaluationConfig,
    WorkflowSimpleResponse, WorkflowStepSimpleResponse
)
from exceptions import (
    WorkflowNotFoundError, InvalidWorkflowError, WorkflowExecutionError,
    StepNotFoundError, ToolNotFoundError, VariableValidationError,
    InvalidStepConfigurationError
)

class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def create_workflow(self, workflow_data: WorkflowCreate, user_id: str) -> Workflow:
        """Create a new workflow with associated steps and variables."""
        # Create the main workflow record
        workflow = Workflow(
            workflow_id=str(uuid4()),
            user_id=user_id,
            name=workflow_data.name,
            description=workflow_data.description,
            status=workflow_data.status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(workflow)
        self.db.flush()  # Flush to get the workflow_id

        # Create steps if provided
        if workflow_data.steps:
            for step_data in workflow_data.steps:
                # Convert evaluation config to dict if present
                evaluation_config = None
                if step_data.evaluation_config:
                    evaluation_config = step_data.evaluation_config.model_dump()

                step = WorkflowStep(
                    step_id=str(uuid4()),
                    workflow_id=workflow.workflow_id,
                    label=step_data.label,
                    description=step_data.description,
                    step_type=step_data.step_type,
                    tool_id=step_data.tool_id,
                    prompt_template_id=step_data.prompt_template_id,
                    parameter_mappings=step_data.parameter_mappings or {},
                    output_mappings=step_data.output_mappings or {},
                    evaluation_config=evaluation_config,
                    sequence_number=step_data.sequence_number,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(step)

        # Create state variables if provided
        if workflow_data.state:
            for var_data in workflow_data.state:
                schema = var_data.value_schema.model_dump()
                var = WorkflowVariable(
                    variable_id=var_data.variable_id or str(uuid4()),
                    workflow_id=workflow.workflow_id,
                    name=var_data.name,
                    description=schema.get('description'),
                    type=schema['type'],
                    value_schema=schema,
                    io_type=var_data.io_type,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(var)

        try:
            self.db.commit()
            self.db.refresh(workflow)
            
            # Return the complete workflow with relationships loaded
            return self.get_workflow(workflow.workflow_id, user_id)
        except Exception as e:
            self.db.rollback()
            raise e

    def get_workflow(self, workflow_id: str, user_id: int) -> WorkflowResponse:
        """
        Retrieve a workflow by ID and user ID.
        
        Args:
            workflow_id (str): The ID of the workflow to retrieve
            user_id (int): The ID of the user requesting the workflow
            
        Returns:
            WorkflowResponse: The workflow data with all related information
            
        Raises:
            HTTPException: If workflow is not found or user doesn't have access
        """
        try:
            # Query the workflow with related data in a single query
            workflow = (
                self.db.query(Workflow)
                .options(
                    joinedload(Workflow.steps).joinedload(WorkflowStep.tool),
                    joinedload(Workflow.variables)
                )
                .filter(
                    Workflow.workflow_id == workflow_id,
                    Workflow.user_id == user_id
                )
                .first()
            )

            if not workflow:
                raise Exception(f"Workflow {workflow_id} not found or access denied")

            # Add debug print to see evaluation config
            for step in workflow.steps:
                print(f"Step {step.step_id} evaluation config: {step.evaluation_config}")

            # Convert to response model
            response = WorkflowResponse(
                workflow_id=workflow.workflow_id,
                user_id=workflow.user_id,
                name=workflow.name,
                description=workflow.description,
                status=workflow.status,
                error=workflow.error,
                created_at=workflow.created_at,
                updated_at=workflow.updated_at,
                steps=[],
                state=[]
            )

            # Add workflow steps with tool information
            for step in workflow.steps:
                print('step', step.evaluation_config)
                # Create evaluation config if it exists
                eval_config = None
                if step.evaluation_config:
                    # Ensure maximum_jumps has a default value if not present
                    eval_config_dict = step.evaluation_config.copy()
                    if 'maximum_jumps' not in eval_config_dict:
                        eval_config_dict['maximum_jumps'] = 3
                    
                    eval_config = EvaluationConfig(
                        conditions=eval_config_dict.get("conditions", []),
                        default_action=eval_config_dict.get("default_action", "continue"),
                        maximum_jumps=eval_config_dict.get("maximum_jumps", 3)
                    )
                
                step_response = WorkflowStepResponse(
                    step_id=step.step_id,
                    workflow_id=step.workflow_id,
                    label=step.label,
                    description=step.description,
                    step_type=step.step_type,
                    tool_id=step.tool_id,
                    prompt_template_id=step.prompt_template_id,
                    parameter_mappings=step.parameter_mappings,
                    output_mappings=step.output_mappings,
                    evaluation_config=eval_config,
                    sequence_number=step.sequence_number,
                    created_at=step.created_at,
                    updated_at=step.updated_at,
                    tool=ToolResponse(
                        tool_id=step.tool.tool_id,
                        name=step.tool.name,
                        description=step.tool.description,
                        tool_type=step.tool.tool_type,
                        signature=self._get_llm_signature(step.prompt_template_id) if step.tool.tool_type == 'llm' and step.prompt_template_id else step.tool.signature,
                        created_at=step.tool.created_at,
                        updated_at=step.tool.updated_at
                    ) if step.tool else None
                )
                response.steps.append(step_response)

            # Add workflow variables to state
            for variable in workflow.variables:
                variable_response = WorkflowVariableResponse(
                    variable_id=variable.variable_id,
                    workflow_id=variable.workflow_id,
                    name=variable.name,
                    description=variable.description,
                    value_schema=variable.value_schema,
                    io_type=variable.io_type,
                    created_at=variable.created_at,
                    updated_at=variable.updated_at
                )
                response.state.append(variable_response)

            return response

        except Exception as e:
            raise Exception(f"Error retrieving workflow: {str(e)}")

    def get_workflow_simple(self, workflow_id: str, user_id: int) -> WorkflowSimpleResponse:
        """
        Retrieve basic workflow information by ID and user ID.
        This is a simplified version that only returns the workflow table columns
        and basic step information without any related data (tools, variables, etc).
        
        Args:
            workflow_id (str): The ID of the workflow to retrieve
            user_id (int): The ID of the user requesting the workflow
            
        Returns:
            WorkflowSimpleResponse: The basic workflow data with steps
            
        Raises:
            Exception: If workflow is not found or user doesn't have access
        """
        try:
            # Query the workflow with steps ordered by sequence number
            workflow = (
                self.db.query(Workflow)
                .options(joinedload(Workflow.steps))
                .filter(
                    Workflow.workflow_id == workflow_id,
                    Workflow.user_id == user_id
                )
                .first()
            )

            if not workflow:
                raise Exception(f"Workflow {workflow_id} not found or access denied")

            # Convert steps to simple response format
            steps = []
            for step in sorted(workflow.steps, key=lambda x: x.sequence_number):
                steps.append(WorkflowStepSimpleResponse(
                    step_id=step.step_id,
                    workflow_id=step.workflow_id,
                    label=step.label,
                    description=step.description,
                    step_type=step.step_type,
                    sequence_number=step.sequence_number,
                    created_at=step.created_at,
                    updated_at=step.updated_at
                ))

            # Convert to simple response model with steps
            return WorkflowSimpleResponse(
                workflow_id=workflow.workflow_id,
                user_id=workflow.user_id,
                name=workflow.name,
                description=workflow.description,
                status=workflow.status,
                error=workflow.error,
                created_at=workflow.created_at,
                updated_at=workflow.updated_at,
                steps=steps
            )

        except Exception as e:
            raise Exception(f"Error retrieving workflow: {str(e)}")

    def get_workflows(self, user_id: int) -> List[WorkflowResponse]:
        """List all workflows for a user."""
        print(f"Getting workflows for user {user_id}")
        workflows = self.db.query(Workflow).filter(Workflow.user_id == user_id).all()
        
        # Convert each workflow to a WorkflowResponse
        return [self.get_workflow(w.workflow_id, user_id) for w in workflows]

    def update_workflow(self, workflow_id: str, workflow_data: WorkflowUpdate, user_id: int) -> WorkflowResponse:
        """Update a workflow."""

        print(f"Retrieving workflow {workflow_id} for user {user_id}")
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        if not workflow:
            raise WorkflowNotFoundError(workflow_id)
        
        try:
            # Convert Pydantic model to dict
            update_data = workflow_data.model_dump(exclude_unset=True)
                                       
            # Update basic workflow properties
            basic_props = {k: v for k, v in update_data.items() 
                         if k not in ['steps', 'inputs', 'outputs']}
            for key, value in basic_props.items():
                setattr(workflow, key, value)
            
            # Update steps if provided
            print(f"Updating workflow steps")
            if 'steps' in update_data:
                # Delete existing steps
                print(f"Deleting existing steps")
                self.db.query(WorkflowStep).filter(
                    WorkflowStep.workflow_id == workflow_id
                ).delete()
                
                # Create new steps with sequence numbers
                print(f"Creating new steps")
                for idx, step_data in enumerate(update_data['steps']):
                    if hasattr(step_data, 'model_dump'):
                        step_dict = step_data.model_dump()
                    else:
                        step_dict = step_data
                    
                    # Add sequence number
                    step_dict['sequence_number'] = idx
                    
                    # Generate UUID if needed
                    if not step_dict.get('step_id') or step_dict['step_id'].startswith('step-'):
                        step_dict['step_id'] = str(uuid4())
                    
                    # Extract tool_id from nested tool object if it exists
                    print("Checking for tool in step_dict")
                    if 'tool' in step_dict and step_dict['tool']:
                        print(f"Tool found in step_dict: {step_dict['tool']}")
                        step_dict['tool_id'] = step_dict['tool']['tool_id']
                    step_dict.pop('tool', None)  # Remove the tool object as it's not in the model

                    # Handle evaluation config
                    if 'evaluation_config' in step_dict and step_dict['evaluation_config']:
                        if hasattr(step_dict['evaluation_config'], 'model_dump'):
                            step_dict['evaluation_config'] = step_dict['evaluation_config'].model_dump()
                        print(f"Evaluation config before step creation: {step_dict['evaluation_config']}")
                        # Ensure maximum_jumps is preserved
                        if 'maximum_jumps' not in step_dict['evaluation_config']:
                            step_dict['evaluation_config']['maximum_jumps'] = 3
                    
                    # Create the step
                    step = WorkflowStep(
                        workflow_id=workflow_id,
                        **step_dict
                    )
                    self.db.add(step)
            
            # Update state variables if provided
            if workflow_data.state is not None:
                # Delete existing variables
                self.db.query(WorkflowVariable).filter(
                    WorkflowVariable.workflow_id == workflow_id
                ).delete()
                
                # Create new state variables
                for var_data in workflow_data.state:
                    # Handle both Pydantic models and dicts
                    var_dict = var_data.model_dump() if hasattr(var_data, 'model_dump') else var_data
                    schema = var_dict['value_schema']
                    var = WorkflowVariable(
                        variable_id=var_dict.get('variable_id', str(uuid4())),
                        workflow_id=workflow_id,
                        name=var_dict['name'],
                        description=schema.get('description'),
                        type=schema['type'],
                        value_schema=schema,
                        io_type=var_dict['io_type'],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    self.db.add(var)
            
            workflow.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(workflow)
            
            # Return the updated workflow using get_workflow to ensure proper response format
            print(f"Returning updated workflow: {self.get_workflow(workflow_id, user_id)}")
            return self.get_workflow(workflow_id, user_id)
            
        except SQLAlchemyError as e:
            print(f"Error updating workflow: {str(e)}")
            self.db.rollback()
            raise WorkflowExecutionError(str(e), workflow_id)

    def delete_workflow(self, workflow_id: str, user_id: int) -> None:
        """Delete a workflow."""
        workflow = self.db.query(Workflow).filter(
            (Workflow.workflow_id == workflow_id) & (Workflow.user_id == user_id)
        ).first()
        
        if not workflow:
            raise WorkflowNotFoundError(workflow_id)
        
        try:
            self.db.delete(workflow)
            self.db.commit()
        except SQLAlchemyError as e:
            self.db.rollback()
            raise WorkflowExecutionError(str(e), workflow_id)

    
    def _get_llm_signature(self, prompt_template_id: str) -> Dict:
        """
        Get the signature for an LLM tool based on its prompt template.
        
        This method converts a prompt template's tokens into tool parameters
        and its output schema into tool outputs, creating a complete tool signature.
        
        Args:
            prompt_template_id: The ID of the prompt template
            
        Returns:
            A dictionary with 'parameters' and 'outputs' lists defining the tool signature
        """
        prompt_template = self.db.query(PromptTemplate).filter(
            PromptTemplate.template_id == prompt_template_id
        ).first()
        
        if not prompt_template:
            print(f"No prompt template found for id: {prompt_template_id}")
            return {'parameters': [], 'outputs': []}
        
        print(f"Found prompt template: {prompt_template.template_id}")
        
        # Convert tokens to parameters
        parameters = []
        for token in prompt_template.tokens:
            # Ensure token has required fields
            if not isinstance(token, dict) or 'name' not in token:
                continue
            
            token_type = token.get('type', 'string')
            
            # Create parameter schema based on token type
            schema = {
                'name': token['name'],
                'type': 'string' if token_type == 'string' else 'file',
                'is_array': False,  # Default to non-array type
                'description': token.get('description', '')
            }
            
            # Add format and content_types for file parameters
            if token_type == 'file' and 'format' in token:
                schema['format'] = token['format']
            
            if token_type == 'file' and 'content_types' in token:
                schema['content_types'] = token['content_types']
            
            parameters.append({
                'name': token['name'],
                'description': f"Value for {{{{{token['name']}}}}} in the prompt" if token_type == 'string' 
                             else f"File content for <<file:{token['name']}>> in the prompt",
                'value_schema': schema,
                'required': token.get('required', True)  # Default to required
            })
        
        # Convert output schema to outputs
        outputs = []
        
        # Ensure output_schema exists and is a dict
        if not isinstance(prompt_template.output_schema, dict):
            print(f"Invalid output schema for template {prompt_template_id}")
            return {'parameters': parameters, 'outputs': []}
        
        output_type = prompt_template.output_schema.get('type', 'string')
        
        if output_type == 'object' and 'fields' in prompt_template.output_schema:

            # Only add the entire object as an output option
            outputs = [{
                'name': 'response',
                'description': prompt_template.output_schema.get('description', 'Complete output object'),
                'value_schema': prompt_template.output_schema
            }]
            
        else:
            # Handle primitive types (string, number, boolean) or arrays
            schema = {
                'type': output_type,
                'is_array': prompt_template.output_schema.get('is_array', False),
                'description': prompt_template.output_schema.get('description', '')
            }
            
            outputs.append({
                'name': 'response',
                'description': prompt_template.output_schema.get('description', 'LLM response'),
                'value_schema': schema
            })
        
        return {
            'parameters': parameters,
            'outputs': outputs
        }
