import {
    Workflow,
    WorkflowStatus,
    WorkflowStepType,
    WorkflowStepId,
    WorkflowVariableName,
    WorkflowVariableRole
} from './workflows';
import { ToolParameterName, ToolOutputName } from './tools';

// Helper function to create typed string literals for branded types
const asStepId = (id: string): WorkflowStepId => id as unknown as WorkflowStepId;
export const asVarName = (name: string): WorkflowVariableName => name as unknown as WorkflowVariableName;
const asParamName = (name: string): ToolParameterName => name as unknown as ToolParameterName;
const asOutputName = (name: string): ToolOutputName => name as unknown as ToolOutputName;

// Define the interface for workflow templates
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    workflow: Workflow;
}

// Define the Develop Question workflow template
export const developQuestionWorkflowTemplate: Workflow = {
    workflow_id: "template-develop-question",
    name: "Develop Question Workflow",
    description: "A workflow that improves the initial question through a two-step process",
    status: WorkflowStatus.DRAFT,
    error: undefined,
    created_at: "2025-03-12T01:04:58",
    updated_at: "2025-03-13T04:04:19",
    steps: [
        {
            label: "Initial Question Processing",
            description: "First step of question improvement",
            step_type: WorkflowStepType.ACTION,
            tool_id: "echo",
            prompt_template_id: undefined,
            parameter_mappings: {
                [asParamName("input")]: asVarName("initial_question")
            },
            output_mappings: {
                [asOutputName("output")]: asVarName("interim_question")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("5a531329-3aad-4dd5-9012-eaae18eeb7f8"),
            workflow_id: "template-develop-question",
            sequence_number: 0,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "echo",
                name: "Echo Tool",
                description: "Echoes back the input with a prefix",
                tool_type: "utility",
                signature: {
                    parameters: [
                        {
                            name: asParamName("input"),
                            description: "The input to echo",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        },
                        {
                            name: asParamName("stringify"),
                            description: "Whether to convert objects to JSON strings",
                            schema: {
                                type: "boolean",
                                is_array: false
                            }
                        }
                    ],
                    outputs: [
                        {
                            name: asOutputName("output"),
                            description: "The echoed output",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        }
                    ]
                }
            }
        },
        {
            label: "Finalize Question",
            description: "Second step to finalize the improved question",
            step_type: WorkflowStepType.ACTION,
            tool_id: "echo",
            prompt_template_id: undefined,
            parameter_mappings: {
                [asParamName("input")]: asVarName("interim_question")
            },
            output_mappings: {
                [asOutputName("output")]: asVarName("improved_question")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("6c642430-bf71-4eb6-a5f0-2c8bbb9e6d9f"),
            workflow_id: "template-develop-question",
            sequence_number: 1,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "echo",
                name: "Echo Tool",
                description: "Echoes back the input with a prefix",
                tool_type: "utility",
                signature: {
                    parameters: [
                        {
                            name: asParamName("input"),
                            description: "The input to echo",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        },
                        {
                            name: asParamName("stringify"),
                            description: "Whether to convert objects to JSON strings",
                            schema: {
                                type: "boolean",
                                is_array: false
                            }
                        }
                    ],
                    outputs: [
                        {
                            name: asOutputName("output"),
                            description: "The echoed output",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        }
                    ]
                }
            }
        }
    ],
    state: [
        {
            name: asVarName("initial_question"),
            schema: {
                type: "string",
                description: "Initial question from user",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "input",
            variable_id: "question_var_input_1",
            value: ""
        },
        {
            name: asVarName("interim_question"),
            schema: {
                type: "string",
                description: "Interim question for processing",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "output",
            variable_id: "question_var_interim_1",
            value: "",
            variable_role: WorkflowVariableRole.INTERMEDIATE
        },
        {
            name: asVarName("improved_question"),
            schema: {
                type: "string",
                description: "Improved question",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "output",
            variable_id: "question_var_output_1",
            value: ""
        }
    ]
};

// Define the Develop KB workflow template
export const developKBWorkflowTemplate: Workflow = {
    workflow_id: "template-develop-kb",
    name: "Develop Knowledge Base Workflow",
    description: "A workflow that develops a knowledge base from the improved question",
    status: WorkflowStatus.DRAFT,
    error: undefined,
    created_at: "2025-03-12T01:04:58",
    updated_at: "2025-03-13T04:04:19",
    steps: [
        {
            label: "Develop Knowledge Base",
            description: "Develops a knowledge base from the improved question",
            step_type: WorkflowStepType.ACTION,
            tool_id: "echo",
            prompt_template_id: undefined,
            parameter_mappings: {
                [asParamName("input")]: asVarName("improved_question")
            },
            output_mappings: {
                [asOutputName("output")]: asVarName("kb")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("6b642430-af60-4da5-94e9-1b7aaa8e5d8f"),
            workflow_id: "template-develop-kb",
            sequence_number: 0,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "echo",
                name: "Echo Tool",
                description: "Echoes back the input with a prefix",
                tool_type: "utility",
                signature: {
                    parameters: [
                        {
                            name: asParamName("input"),
                            description: "The input to echo",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        },
                        {
                            name: asParamName("stringify"),
                            description: "Whether to convert objects to JSON strings",
                            schema: {
                                type: "boolean",
                                is_array: false
                            }
                        }
                    ],
                    outputs: [
                        {
                            name: asOutputName("output"),
                            description: "The echoed output",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        }
                    ]
                }
            }
        }
    ],
    state: [
        {
            name: asVarName("improved_question"),
            schema: {
                type: "string",
                description: "Improved question from previous step",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "input",
            variable_id: "kb_var_input_1",
            value: ""
        },
        {
            name: asVarName("kb"),
            schema: {
                type: "string",
                description: "Knowledge base",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "output",
            variable_id: "kb_var_output_1",
            value: ""
        }
    ]
};

// Define the Develop Answer workflow template
export const developAnswerWorkflowTemplate: Workflow = {
    workflow_id: "template-develop-answer",
    name: "Develop Answer Workflow",
    description: "A workflow that develops an answer from the improved question and knowledge base",
    status: WorkflowStatus.DRAFT,
    error: undefined,
    created_at: "2025-03-12T01:04:58",
    updated_at: "2025-03-13T04:04:19",
    steps: [
        {
            label: "Develop Answer",
            description: "Develops an answer from the improved question and knowledge base",
            step_type: WorkflowStepType.ACTION,
            tool_id: "concatenate",
            prompt_template_id: undefined,
            parameter_mappings: {
                [asParamName("first")]: asVarName("improved_question"),
                [asParamName("second")]: asVarName("kb")
            },
            output_mappings: {
                [asOutputName("result")]: asVarName("final_answer")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("7c753541-bf71-5eb6-a5f0-2c8bbb9e6d9g"),
            workflow_id: "template-develop-answer",
            sequence_number: 0,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "concatenate",
                name: "Concatenate Tool",
                description: "Concatenates two strings together",
                tool_type: "utility",
                signature: {
                    parameters: [
                        {
                            name: asParamName("first"),
                            description: "First string to concatenate",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        },
                        {
                            name: asParamName("second"),
                            description: "Second string to concatenate",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        }
                    ],
                    outputs: [
                        {
                            name: asOutputName("result"),
                            description: "The concatenated result",
                            schema: {
                                type: "string",
                                is_array: false
                            }
                        }
                    ]
                }
            }
        }
    ],
    state: [
        {
            name: asVarName("improved_question"),
            schema: {
                type: "string",
                description: "Improved question from previous step",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "input",
            variable_id: "answer_var_input_1",
            value: "",
            variable_role: WorkflowVariableRole.USER_INPUT
        },
        {
            name: asVarName("kb"),
            schema: {
                type: "string",
                description: "Knowledge base from previous step",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "input",
            variable_id: "answer_var_input_2",
            value: "",
            variable_role: WorkflowVariableRole.INTERMEDIATE
        },
        {
            name: asVarName("final_answer"),
            schema: {
                type: "string",
                description: "Final answer",
                is_array: false,
                fields: {},
                format: undefined,
                content_types: undefined
            },
            io_type: "output",
            variable_id: "answer_var_output_1",
            value: "",
            variable_role: WorkflowVariableRole.FINAL
        }
    ]
};

// Define the Email Agent workflow template
export const emailAgentWorkflowTemplate: Workflow = {
    workflow_id: "template-email-agent",
    name: "Email Agent Workflow",
    description: "A workflow that retrieves and processes emails from Gmail",
    status: WorkflowStatus.DRAFT,
    error: undefined,
    created_at: "2025-03-12T01:04:58",
    updated_at: "2025-03-13T04:04:19",
    steps: [
        {
            label: "List Email Labels",
            description: "Retrieves all email labels/folders",
            step_type: WorkflowStepType.ACTION,
            tool_id: "email_labels",
            prompt_template_id: undefined,
            parameter_mappings: {},
            output_mappings: {
                [asOutputName("labels")]: asVarName("email_labels")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("7a531329-3aad-4dd5-9012-eaae18eeb7f8"),
            workflow_id: "template-email-agent",
            sequence_number: 0,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "email_labels",
                name: "Email Labels Tool",
                description: "Retrieves all email labels/folders from Gmail",
                tool_type: "retrieve",
                signature: {
                    parameters: [],
                    outputs: [
                        {
                            name: asOutputName("labels"),
                            description: "List of email labels",
                            schema: {
                                type: "array",
                                is_array: true,
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        type: { type: "string" }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        },
        {
            label: "Get Email Messages",
            description: "Retrieves email messages based on search parameters",
            step_type: WorkflowStepType.ACTION,
            tool_id: "email_messages",
            prompt_template_id: undefined,
            parameter_mappings: {
                [asParamName("folders")]: asVarName("selected_folders"),
                [asParamName("query_terms")]: asVarName("search_terms"),
                [asParamName("max_results")]: asVarName("max_results")
            },
            output_mappings: {
                [asOutputName("messages")]: asVarName("email_messages")
            },
            evaluation_config: {
                conditions: [],
                default_action: "continue",
                maximum_jumps: 1
            },
            step_id: asStepId("8b642430-bf71-4eb6-a5f0-2c8bbb9e6d9f"),
            workflow_id: "template-email-agent",
            sequence_number: 1,
            created_at: "2025-03-13T04:04:19",
            updated_at: "2025-03-13T04:04:19",
            tool: {
                tool_id: "email_messages",
                name: "Email Messages Tool",
                description: "Retrieves email messages from Gmail based on search parameters",
                tool_type: "retrieve",
                signature: {
                    parameters: [
                        {
                            name: asParamName("folders"),
                            description: "List of folder/label IDs to search in",
                            schema: {
                                type: "array",
                                is_array: true,
                                items: { type: "string" }
                            }
                        },
                        {
                            name: asParamName("query_terms"),
                            description: "List of search terms",
                            schema: {
                                type: "array",
                                is_array: true,
                                items: { type: "string" }
                            }
                        },
                        {
                            name: asParamName("max_results"),
                            description: "Maximum number of results to return",
                            schema: {
                                type: "integer",
                                is_array: false,
                                minimum: 1,
                                maximum: 500
                            }
                        }
                    ],
                    outputs: [
                        {
                            name: asOutputName("messages"),
                            description: "List of email messages",
                            schema: {
                                type: "array",
                                is_array: true,
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        threadId: { type: "string" },
                                        labelIds: {
                                            type: "array",
                                            is_array: true,
                                            items: { type: "string" }
                                        },
                                        snippet: { type: "string" },
                                        headers: {
                                            type: "object",
                                            additionalProperties: { type: "string" }
                                        },
                                        body: { type: "string" },
                                        internalDate: { type: "string" }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
    ],
    state: [
        {
            name: asVarName("selected_folders"),
            schema: {
                type: "array",
                description: "Selected email folders/labels to search in",
                is_array: true,
                items: { type: "string" }
            },
            io_type: "input",
            variable_id: "email_var_input_1",
            value: []
        },
        {
            name: asVarName("search_terms"),
            schema: {
                type: "array",
                description: "Search terms for filtering emails",
                is_array: true,
                items: { type: "string" }
            },
            io_type: "input",
            variable_id: "email_var_input_2",
            value: []
        },
        {
            name: asVarName("max_results"),
            schema: {
                type: "integer",
                description: "Maximum number of results to return",
                is_array: false,
                minimum: 1,
                maximum: 500
            },
            io_type: "input",
            variable_id: "email_var_input_3",
            value: 100
        },
        {
            name: asVarName("email_labels"),
            schema: {
                type: "array",
                description: "List of available email labels",
                is_array: true,
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        type: { type: "string" }
                    }
                }
            },
            io_type: "output",
            variable_id: "email_var_output_1",
            value: []
        },
        {
            name: asVarName("email_messages"),
            schema: {
                type: "array",
                description: "Retrieved email messages",
                is_array: true,
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        threadId: { type: "string" },
                        labelIds: {
                            type: "array",
                            is_array: true,
                            items: { type: "string" }
                        },
                        snippet: { type: "string" },
                        headers: {
                            type: "object",
                            additionalProperties: { type: "string" }
                        },
                        body: { type: "string" },
                        internalDate: { type: "string" }
                    }
                }
            },
            io_type: "output",
            variable_id: "email_var_output_2",
            value: []
        }
    ]
};

// Create an array of all workflow templates
export const workflowTemplates: WorkflowTemplate[] = [
    {
        id: "develop-question",
        name: "Develop Question Workflow",
        description: "A workflow that improves the initial question",
        workflow: developQuestionWorkflowTemplate
    },
    {
        id: "develop-kb",
        name: "Develop Knowledge Base Workflow",
        description: "A workflow that develops a knowledge base from the improved question",
        workflow: developKBWorkflowTemplate
    },
    {
        id: "develop-answer",
        name: "Develop Answer Workflow",
        description: "A workflow that develops an answer from the improved question and knowledge base",
        workflow: developAnswerWorkflowTemplate
    },
    {
        id: "email-agent",
        name: "Email Agent Workflow",
        description: "A workflow that retrieves and processes emails from Gmail",
        workflow: emailAgentWorkflowTemplate
    }
];

/**
 * Get a workflow template by ID
 * @param templateId The ID of the template to get
 * @returns The workflow template or undefined if not found
 */
export function getWorkflowTemplate(templateId: string): WorkflowTemplate | undefined {
    return workflowTemplates.find(template => template.id === templateId);
}

/**
 * Create a new workflow from a template
 * @param templateId The ID of the template to use
 * @returns A new workflow based on the template with a new ID
 */
export function createWorkflowFromTemplate(templateId: string): Workflow | null {
    const template = getWorkflowTemplate(templateId);
    if (!template) return null;

    // Create a deep copy of the template workflow
    const newWorkflow: Workflow = JSON.parse(JSON.stringify(template.workflow));

    // Update IDs to make it a new workflow
    newWorkflow.workflow_id = 'new';
    newWorkflow.name = `${template.name} (Copy)`;

    // Generate new step IDs
    newWorkflow.steps = newWorkflow.steps.map(step => {
        const newStepId = asStepId(`step-${crypto.randomUUID()}`);
        step.step_id = newStepId;
        step.workflow_id = 'new';
        return step;
    });

    // Reset state values and update workflow_id
    if (newWorkflow.state) {
        newWorkflow.state = newWorkflow.state.map(variable => {
            return {
                ...variable,
                value: undefined
            };
        });
    }

    return newWorkflow;
}