import { v4 as uuidv4 } from 'uuid';
import { AgentWorkflow, AgentWorkflowType, WORKFLOW_VARIABLES } from '../../../../types/agent-workflows';
import { WorkflowStatus, WorkflowStepId, WorkflowStepType, WorkflowVariableName } from '../../../../types/workflows';
import { createArraySchema, createBasicSchema, createWorkflowVariable } from '../../../../utils/workflowUtils';
import { ToolOutputName, ToolParameterName } from '../../../../types/tools';

/**
 * Creates a Knowledge Base Development workflow
 */
export const createKnowledgeBaseDevelopmentWorkflow = (): AgentWorkflow => {
    const workflowId = uuidv4();

    const workflow: AgentWorkflow = {
        workflow_id: workflowId,
        agent_workflow_type: AgentWorkflowType.KNOWLEDGE_BASE_DEVELOPMENT,
        name: 'Knowledge Base Development Agent',
        description: 'Creates a comprehensive knowledge base for answering the question',
        status: WorkflowStatus.DRAFT,
        max_iterations: 5,
        confidence_threshold: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Define workflow variables
        state: [
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.KB_INPUT_QUESTION,
                createBasicSchema('string', 'The question to build a knowledge base for'),
                'input',
                true
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.KNOWLEDGE_BASE,
                createArraySchema('object', 'The knowledge base containing information to answer the question'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.KB_COMPLETENESS_SCORE,
                createBasicSchema('number', 'Score indicating how complete the knowledge base is'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.KB_GAPS,
                createArraySchema('string', 'Identified gaps in the knowledge base'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                WORKFLOW_VARIABLES.KB_SOURCES,
                createArraySchema('object', 'Sources of information in the knowledge base'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                'kb_iterations' as WorkflowVariableName,
                createBasicSchema('number', 'Number of iterations performed'),
                'output'
            )
        ],

        // Define workflow steps
        steps: [
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Search for Information',
                description: 'Search for relevant information to answer the question',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'information_search_tool',
                parameter_mappings: {
                    ['query' as ToolParameterName]: WORKFLOW_VARIABLES.KB_INPUT_QUESTION
                },
                output_mappings: {
                    ['search_results' as ToolOutputName]: 'search_results' as WorkflowVariableName
                },
                sequence_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Build Knowledge Base',
                description: 'Compile search results into a structured knowledge base',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'knowledge_base_builder_tool',
                parameter_mappings: {
                    ['question' as ToolParameterName]: WORKFLOW_VARIABLES.KB_INPUT_QUESTION,
                    ['search_results' as ToolParameterName]: 'search_results' as WorkflowVariableName
                },
                output_mappings: {
                    ['knowledge_base' as ToolOutputName]: WORKFLOW_VARIABLES.KNOWLEDGE_BASE,
                    ['sources' as ToolOutputName]: WORKFLOW_VARIABLES.KB_SOURCES
                },
                sequence_number: 2,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Evaluate Knowledge Base',
                description: 'Evaluate the completeness of the knowledge base',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'knowledge_base_evaluator_tool',
                parameter_mappings: {
                    ['question' as ToolParameterName]: WORKFLOW_VARIABLES.KB_INPUT_QUESTION,
                    ['knowledge_base' as ToolParameterName]: WORKFLOW_VARIABLES.KNOWLEDGE_BASE
                },
                output_mappings: {
                    ['completeness_score' as ToolOutputName]: WORKFLOW_VARIABLES.KB_COMPLETENESS_SCORE,
                    ['gaps' as ToolOutputName]: WORKFLOW_VARIABLES.KB_GAPS
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
                    ['iterations' as ToolOutputName]: 'kb_iterations' as WorkflowVariableName
                },
                sequence_number: 4,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ]
    };

    return workflow;
}; 