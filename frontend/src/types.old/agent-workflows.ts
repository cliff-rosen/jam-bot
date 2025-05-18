import { Workflow, WorkflowVariableName, WorkflowVariableRole } from './workflows';
import { createWorkflowFromTemplate, workflowTemplates as templates, workflowTemplates, asVarName } from './workflow-templates';

/**
 * Enum defining the types of agent workflows
 */
export enum AgentWorkflowType {
    QUESTION_DEVELOPMENT = 'QUESTION_DEVELOPMENT',
    KNOWLEDGE_BASE_DEVELOPMENT = 'KNOWLEDGE_BASE_DEVELOPMENT',
    ANSWER_GENERATION = 'ANSWER_GENERATION',
    COMPLETE_AGENT_WORKFLOW = 'COMPLETE_AGENT_WORKFLOW'
}

/**
 * Interface extending the base Workflow with agent-specific properties
 */
export interface AgentWorkflow extends Workflow {
    agent_workflow_type: string;
    max_iterations?: number;
    confidence_threshold?: number;
}



/**
 * Interface for a workflow phase in a chain
 */
export interface WorkflowPhase {
    id: string;
    type: AgentWorkflowType;
    label: string;
    description: string;
    workflow: () => Promise<AgentWorkflow> | AgentWorkflow;
    inputs_mappings: Record<WorkflowVariableName, WorkflowVariableName>;
    outputs_mappings: Record<WorkflowVariableName, WorkflowVariableName>;
}

/**
 * Interface for a collection of workflows to be executed in sequence
 */
export interface AgentWorkflowChain {
    id: string;
    name: string;
    description: string;
    phases: WorkflowPhase[];
    state?: Record<string, any>; // For now, keeping as Record for backward compatibility
}


/**
 * Simplified agent workflow chain using sample workflow templates
 */
export const SAMPLE_WORKFLOW_CHAIN: AgentWorkflowChain = {
    id: 'sample_workflow_chain',
    name: 'Sample Workflow Chain',
    description: 'Simple workflow chain using our sample workflow templates',
    phases: [
        {
            id: 'question_development_phase',
            type: AgentWorkflowType.QUESTION_DEVELOPMENT,
            label: 'Question Development',
            description: 'Develop a question based on the input',
            workflow: () => createWorkflowFromTemplate('develop-question') as AgentWorkflow,
            inputs_mappings: {
                // Map initial_question from chain state to workflow input
                [asVarName('initial_question')]: asVarName('wfc_initial_question')
            },
            outputs_mappings: {
                // Map improved_question from workflow output to chain state
                [asVarName('improved_question')]: asVarName('wfc_improved_question')
            }
        },
        {
            id: 'knowledge_base_development_phase',
            type: AgentWorkflowType.KNOWLEDGE_BASE_DEVELOPMENT,
            label: 'Knowledge Base Development',
            description: 'Develop a knowledge base based on the improved question',
            workflow: () => createWorkflowFromTemplate('develop-kb') as AgentWorkflow,
            inputs_mappings: {
                // Map improved_question from chain state to workflow input
                [asVarName('improved_question')]: asVarName('wfc_improved_question')
            },
            outputs_mappings: {
                // Map kb from workflow output to chain state
                [asVarName('kb')]: asVarName('wfc_kb')
            }
        },
        {
            id: 'answer_generation_phase',
            type: AgentWorkflowType.ANSWER_GENERATION,
            label: 'Answer Generation',
            description: 'Generate an answer based on the improved question and knowledge base',
            workflow: () => createWorkflowFromTemplate('develop-answer') as AgentWorkflow,
            inputs_mappings: {
                // Map improved_question and kb from chain state to workflow inputs
                [asVarName('improved_question')]: asVarName('wfc_improved_question'),
                [asVarName('kb')]: asVarName('wfc_kb')
            },
            outputs_mappings: {
                // Map final_answer from workflow output to chain state
                [asVarName('final_answer')]: asVarName('wfc_final_answer')
            }
        }
    ],
    state: [
        // Input variable - question from user
        {
            variable_id: 'wfc_input1',
            name: 'wfc_initial_question',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The initial question from the user'
            },
            value: '',
            io_type: 'input',
            required: true,
            variable_role: WorkflowVariableRole.USER_INPUT
        },
        // Improved question from first phase
        {
            variable_id: 'wfc_output1',
            name: 'wfc_improved_question',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The improved question from the first phase'
            },
            value: '',
            io_type: 'output',
            variable_role: WorkflowVariableRole.FINAL
        },
        // Knowledge base from second phase
        {
            variable_id: 'wfc_output2',
            name: 'wfc_kb',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The knowledge base from the second phase'
            },
            value: '',
            io_type: 'output',
            variable_role: WorkflowVariableRole.FINAL
        },
        // Final answer from third phase
        {
            variable_id: 'wfc_output3',
            name: 'wfc_final_answer',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The final answer from the third phase'
            },
            value: '',
            io_type: 'output',
            variable_role: WorkflowVariableRole.FINAL
        }
    ]
}; 