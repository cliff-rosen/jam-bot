import { v4 as uuidv4 } from 'uuid';
import { AgentWorkflow, AgentWorkflowType, WORKFLOW_VARIABLES } from '../../../../types/agent-workflows';
import { WorkflowStatus, WorkflowStepId, WorkflowStepType, WorkflowVariableName } from '../../../../types/workflows';
import { createArraySchema, createBasicSchema, createWorkflowVariable } from '../../../../utils/workflowUtils';
import { ToolOutputName, ToolParameterName } from '../../../../types/tools';

/**
 * Creates an Answer Generation workflow
 */
export const createAnswerGenerationWorkflow = (): AgentWorkflow => {
    const workflowId = uuidv4();

    const workflow: AgentWorkflow = {
        workflow_id: workflowId,
        agent_workflow_type: AgentWorkflowType.ANSWER_GENERATION,
        name: 'Answer Generation Agent',
        description: 'Generates a comprehensive answer based on the knowledge base',
        status: WorkflowStatus.DRAFT,
        max_iterations: 3,
        confidence_threshold: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Define workflow variables
        state: [
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.ANSWER_INPUT_QUESTION,
                createBasicSchema('string', 'The question to answer'),
                'input',
                true
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.ANSWER_INPUT_KB,
                createArraySchema('object', 'The knowledge base to use for answering'),
                'input',
                true
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.FINAL_ANSWER,
                createBasicSchema('string', 'The final answer to the question'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.ANSWER_CONFIDENCE,
                createBasicSchema('number', 'Confidence score for the answer'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.ANSWER_SOURCES,
                createArraySchema('object', 'Sources cited in the answer'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                'answer_iterations' as WorkflowVariableName,
                createBasicSchema('number', 'Number of iterations performed'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                'answer_draft' as WorkflowVariableName,
                createBasicSchema('string', 'Draft of the answer'),
                'output'
            )
        ],

        // Define workflow steps
        steps: [
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Analyze Knowledge Base',
                description: 'Analyze the knowledge base to identify key information',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'kb_analyzer_tool',
                parameter_mappings: {
                    ['question' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_QUESTION,
                    ['knowledge_base' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_KB
                },
                output_mappings: {
                    ['analysis' as ToolOutputName]: 'kb_analysis' as WorkflowVariableName
                },
                sequence_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Draft Answer',
                description: 'Create a draft answer based on the knowledge base',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'answer_drafter_tool',
                parameter_mappings: {
                    ['question' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_QUESTION,
                    ['knowledge_base' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_KB,
                    ['analysis' as ToolParameterName]: 'kb_analysis' as WorkflowVariableName
                },
                output_mappings: {
                    ['draft' as ToolOutputName]: 'answer_draft' as WorkflowVariableName,
                    ['sources' as ToolOutputName]: WORKFLOW_VARIABLES.ANSWER_SOURCES
                },
                sequence_number: 2,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Refine Answer',
                description: 'Refine the draft answer for clarity and completeness',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'answer_refiner_tool',
                parameter_mappings: {
                    ['question' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_QUESTION,
                    ['draft' as ToolParameterName]: 'answer_draft' as WorkflowVariableName,
                    ['knowledge_base' as ToolParameterName]: WORKFLOW_VARIABLES.ANSWER_INPUT_KB
                },
                output_mappings: {
                    ['final_answer' as ToolOutputName]: WORKFLOW_VARIABLES.FINAL_ANSWER,
                    ['confidence' as ToolOutputName]: WORKFLOW_VARIABLES.ANSWER_CONFIDENCE
                },
                sequence_number: 3,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Track Iterations',
                description: 'Track the number of iterations performed',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'iteration_tracker_tool',
                parameter_mappings: {},
                output_mappings: {
                    ['iterations' as ToolOutputName]: 'answer_iterations' as WorkflowVariableName
                },
                sequence_number: 4,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ]
    };

    return workflow;
}; 