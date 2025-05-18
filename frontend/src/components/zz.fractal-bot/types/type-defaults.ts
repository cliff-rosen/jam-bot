import { Asset, ChatMessage, Mission, Workflow, Workspace, WorkspaceState, MissionProposal, Stage, WorkflowVariable } from './index';
import { availableTools } from './tools';

// default workspace object
export const workspaceTemplate: Workspace = {
    id: 'workspace-template',
    type: 'text',
    title: '',
    status: 'completed',
    content: {
        text: '',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}

// default chat message object
export const chatMessageTemplate: ChatMessage = {
    id: 'chat-message-template',
    role: 'user',
    content: '',
    timestamp: new Date().toISOString(),
}

// default workflow object
export const workflowTemplate: Workflow = {
    id: 'workflow-template',
    name: '',
    description: '',
    status: 'pending',
    stages: [],
    state: [],
    inputMappings: [],
    outputMappings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}


// Example workflow demonstrating proper variable and mapping structure
export const workflowExample: Workflow = {
    id: 'research-workflow',
    name: 'Research and Answer Generation',
    description: 'A comprehensive workflow for researching and answering complex questions',
    status: 'pending',
    stages: [
        {
            id: 'question-development',
            name: 'Question Development',
            description: 'Develop and refine the research question',
            status: 'pending',
            steps: [],
            state: [
                // Stage-level input variables
                {
                    variable_id: 'question-dev-input',
                    name: 'raw_question',
                    schema: {
                        type: 'string',
                        is_array: false,
                        description: 'The initial question to develop'
                    },
                    io_type: 'input',
                    required: true,
                    status: 'pending',
                    createdBy: 'question-development',
                    error_message: undefined
                },
                // Stage-level output variables
                {
                    variable_id: 'question-dev-output',
                    name: 'developed_question',
                    schema: {
                        type: 'string',
                        is_array: false,
                        description: 'The developed and refined question'
                    },
                    io_type: 'output',
                    status: 'pending',
                    createdBy: 'question-development',
                    error_message: undefined
                }
            ],
            inputMappings: [
                {
                    sourceVariableId: 'research-workflow-input',
                    target: {
                        type: 'variable',
                        variableId: 'question-dev-input'
                    }
                }
            ],
            outputMappings: [
                {
                    sourceVariableId: 'question-dev-output',
                    target: {
                        type: 'variable',
                        variableId: 'research-workflow-intermediate'
                    }
                }
            ],
            success_criteria: ['Question is properly developed and refined'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'information-gathering',
            name: 'Information Gathering',
            description: 'Gather relevant information for the question',
            status: 'pending',
            steps: [],
            state: [
                // Stage-level input variables
                {
                    variable_id: 'info-gather-input',
                    name: 'developed_question',
                    schema: {
                        type: 'string',
                        is_array: false,
                        description: 'The developed question to research'
                    },
                    io_type: 'input',
                    required: true,
                    status: 'pending',
                    createdBy: 'information-gathering',
                    error_message: undefined
                },
                // Stage-level output variables
                {
                    variable_id: 'info-gather-output',
                    name: 'research_findings',
                    schema: {
                        type: 'object',
                        is_array: true,
                        description: 'The gathered research findings',
                        fields: {
                            source: { type: 'string', is_array: false },
                            content: { type: 'string', is_array: false },
                            relevance: { type: 'number', is_array: false }
                        }
                    },
                    io_type: 'output',
                    status: 'pending',
                    createdBy: 'information-gathering',
                    error_message: undefined
                }
            ],
            inputMappings: [
                {
                    sourceVariableId: 'research-workflow-intermediate',
                    target: {
                        type: 'variable',
                        variableId: 'info-gather-input'
                    }
                }
            ],
            outputMappings: [
                {
                    sourceVariableId: 'info-gather-output',
                    target: {
                        type: 'variable',
                        variableId: 'research-workflow-intermediate2'
                    }
                }
            ],
            success_criteria: ['Comprehensive research findings are gathered'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: 'answer-generation',
            name: 'Answer Generation',
            description: 'Generate the final answer based on research',
            status: 'pending',
            steps: [],
            state: [
                // Stage-level input variables
                {
                    variable_id: 'answer-gen-input1',
                    name: 'developed_question',
                    schema: {
                        type: 'string',
                        is_array: false,
                        description: 'The developed question'
                    },
                    io_type: 'input',
                    required: true,
                    status: 'pending',
                    createdBy: 'answer-generation',
                    error_message: undefined
                },
                {
                    variable_id: 'answer-gen-input2',
                    name: 'research_findings',
                    schema: {
                        type: 'object',
                        is_array: true,
                        description: 'The research findings',
                        fields: {
                            source: { type: 'string', is_array: false },
                            content: { type: 'string', is_array: false },
                            relevance: { type: 'number', is_array: false }
                        }
                    },
                    io_type: 'input',
                    required: true,
                    status: 'pending',
                    createdBy: 'answer-generation',
                    error_message: undefined
                },
                // Stage-level output variables
                {
                    variable_id: 'answer-gen-output',
                    name: 'final_answer',
                    schema: {
                        type: 'string',
                        is_array: false,
                        description: 'The final answer to the question',
                        format: 'markdown'
                    },
                    io_type: 'output',
                    status: 'pending',
                    createdBy: 'answer-generation',
                    error_message: undefined
                }
            ],
            inputMappings: [
                {
                    sourceVariableId: 'research-workflow-intermediate',
                    target: {
                        type: 'variable',
                        variableId: 'answer-gen-input1'
                    }
                },
                {
                    sourceVariableId: 'research-workflow-intermediate2',
                    target: {
                        type: 'variable',
                        variableId: 'answer-gen-input2'
                    }
                }
            ],
            outputMappings: [
                {
                    sourceVariableId: 'answer-gen-output',
                    target: {
                        type: 'variable',
                        variableId: 'research-workflow-output'
                    }
                }
            ],
            success_criteria: ['Comprehensive answer is generated'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],
    state: [
        // Workflow-level input variables
        {
            variable_id: 'research-workflow-input',
            name: 'raw_question',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The initial question to research'
            },
            io_type: 'input',
            required: true,
            status: 'pending',
            createdBy: 'research-workflow',
            error_message: undefined
        },
        // Workflow-level intermediate variables
        {
            variable_id: 'research-workflow-intermediate',
            name: 'developed_question',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The developed question'
            },
            io_type: 'wip',
            status: 'pending',
            createdBy: 'research-workflow',
            error_message: undefined
        },
        {
            variable_id: 'research-workflow-intermediate2',
            name: 'research_findings',
            schema: {
                type: 'object',
                is_array: true,
                description: 'The research findings',
                fields: {
                    source: { type: 'string', is_array: false },
                    content: { type: 'string', is_array: false },
                    relevance: { type: 'number', is_array: false }
                }
            },
            io_type: 'wip',
            status: 'pending',
            createdBy: 'research-workflow',
            error_message: undefined
        },
        // Workflow-level output variables
        {
            variable_id: 'research-workflow-output',
            name: 'final_answer',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The final answer to the question',
                format: 'markdown'
            },
            io_type: 'output',
            status: 'pending',
            createdBy: 'research-workflow',
            error_message: undefined
        }
    ],
    inputMappings: [
        {
            sourceVariableId: 'research-mission-input',
            target: {
                type: 'variable',
                variableId: 'research-workflow-input'
            }
        }
    ],
    outputMappings: [
        {
            sourceVariableId: 'research-workflow-output',
            target: {
                type: 'variable',
                variableId: 'research-mission-output'
            }
        }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

// default mission object
export const missionTemplate: Mission = {
    id: 'mission-template',
    title: '',
    goal: '',
    status: 'pending',
    workflow: workflowTemplate,
    state: [],
    inputMappings: [],
    outputMappings: [],
    resources: [],
    success_criteria: [],
    selectedTools: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
}

// Example mission demonstrating proper variable and mapping structure
export const missionExample: Mission = {
    id: 'research-mission',
    title: 'Research Question',
    goal: 'Research and answer a complex question',
    status: 'pending',
    workflow: workflowExample,
    state: [
        // Mission-level input variables
        {
            variable_id: 'research-mission-input',
            name: 'raw_question',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The initial question to research'
            },
            io_type: 'input',
            required: true,
            status: 'pending',
            createdBy: 'research-mission',
            error_message: undefined
        },
        // Mission-level output variables
        {
            variable_id: 'research-mission-output',
            name: 'final_answer',
            schema: {
                type: 'string',
                is_array: false,
                description: 'The final answer to the question',
                format: 'markdown'
            },
            io_type: 'output',
            status: 'pending',
            createdBy: 'research-mission',
            error_message: undefined
        }
    ],
    inputMappings: [], // These would map to external inputs
    outputMappings: [], // These would map to external outputs
    resources: ['Question Development Tool', 'Research Tools', 'Answer Generation Tool'],
    success_criteria: [
        'Question is properly developed and refined',
        'Comprehensive research findings are gathered',
        'Comprehensive answer is generated'
    ],
    selectedTools: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const workspaceStateTemplate: WorkspaceState = {
    currentMissionId: null,
    currentStageId: null,
    currentStepPath: [],
    viewMode: 'compact',
}

// default assets object
export const assetsTemplate: Asset[] = [];

