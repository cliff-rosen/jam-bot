import { v4 as uuidv4 } from 'uuid';
import { AgentWorkflow, AgentWorkflowType } from '../../../../types/agent-workflows';
import {
    WorkflowStatus,
    WorkflowStepId,
    WorkflowStepType,
    WorkflowVariableName,
    EvaluationOperator,
    VariableOperationType,
    EnhancedOutputMapping
} from '../../../../types/workflows';
import { createBasicSchema, createObjectSchema, createArraySchema, createWorkflowVariable } from '../../../../utils/workflowUtils';
import { Tool, ToolOutputName, ToolParameterName, ToolParameter, ToolOutput } from '../../../../types/tools';

/**
 * Creates a Question Development workflow
 */
export const createQuestionDevelopmentWorkflow = (): AgentWorkflow => {
    const workflowId = 'question-development';

    // Define variable names
    const questionVar = 'question' as WorkflowVariableName;
    const improvementResponseVar = 'improvement_response' as WorkflowVariableName;
    const responseEvaluationVar = 'response_evaluation' as WorkflowVariableName;
    const improvementHistoryVar = 'improvement_history' as WorkflowVariableName;

    // Create mappings for improvement step
    const paramMappings = {} as Record<ToolParameterName, WorkflowVariableName>;
    const outputMappings = {} as Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>;

    // Add mappings for improvement step
    paramMappings['question' as unknown as ToolParameterName] = questionVar;
    paramMappings['improvement_history' as unknown as ToolParameterName] = improvementHistoryVar;

    // Use assign operation for the improvement response
    outputMappings['response' as unknown as ToolOutputName] = {
        variable: improvementResponseVar,
        operation: VariableOperationType.ASSIGN
    };

    // Create mappings for validation step
    const validatorParamMappings = {} as Record<ToolParameterName, WorkflowVariableName>;
    const validatorOutputMappings = {} as Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>;

    // Add mappings for validation step
    validatorParamMappings['original_question' as unknown as ToolParameterName] = questionVar;
    validatorParamMappings['improved_question' as unknown as ToolParameterName] = `${improvementResponseVar}.improvedQuestion` as WorkflowVariableName;
    validatorParamMappings['improvement_history' as unknown as ToolParameterName] = improvementHistoryVar;

    // Use assign operation for the evaluation
    validatorOutputMappings['response' as unknown as ToolOutputName] = {
        variable: responseEvaluationVar,
        operation: VariableOperationType.ASSIGN
    };

    // Create mappings for echo step
    const echoParamMappings = {} as Record<ToolParameterName, WorkflowVariableName>;
    const echoOutputMappings = {} as Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>;

    // Add mappings for echo step
    echoParamMappings['input' as unknown as ToolParameterName] = responseEvaluationVar;

    // Use append operation for the echo output
    echoOutputMappings['output' as unknown as ToolOutputName] = {
        variable: improvementHistoryVar,
        operation: VariableOperationType.APPEND
    };

    // Create the tool with proper type assertions
    const llmTool: Tool = {
        tool_id: 'llm',
        name: 'Language Model',
        description: 'Executes prompts using a language model',
        tool_type: 'llm',
        signature: {
            parameters: [
                {
                    name: 'question' as unknown as ToolParameterName,
                    description: 'Value for {{question}} in the prompt',
                    schema: {
                        type: 'string',
                        description: 'The original question to improve',
                        is_array: false,
                        fields: {}
                    },
                    required: true
                } as ToolParameter,
                {
                    name: 'improvement_history' as unknown as ToolParameterName,
                    description: 'Value for {{improvement_history}} in the prompt',
                    schema: {
                        type: 'object',
                        description: 'History of previous improvements',
                        is_array: true,
                        fields: {
                            improvedQuestion: {
                                type: 'string',
                                is_array: false,
                                description: 'An improved version of the question'
                            },
                            explanation: {
                                type: 'string',
                                is_array: false,
                                description: 'Explanation of the improvements made'
                            },
                            evaluation: {
                                type: 'string',
                                is_array: false,
                                description: 'Evaluation of the improvement quality'
                            },
                            confidenceScore: {
                                type: 'number',
                                is_array: false,
                                description: 'Confidence score for the improvement'
                            }
                        }
                    },
                    required: false
                } as ToolParameter
            ],
            outputs: [
                {
                    name: 'response' as unknown as ToolOutputName,
                    description: 'Improved question with explanation',
                    schema: {
                        type: 'object',
                        description: 'Improved question with explanation',
                        is_array: false,
                        fields: {
                            improvedQuestion: {
                                type: 'string',
                                is_array: false,
                                description: 'The improved version of the question'
                            },
                            explanation: {
                                type: 'string',
                                is_array: false,
                                description: 'Explanation of the improvements made'
                            }
                        }
                    }
                } as ToolOutput
            ]
        }
    };

    // Create the validator tool
    const validatorTool: Tool = {
        tool_id: 'llm',
        name: 'Language Model',
        description: 'Executes prompts using a language model',
        tool_type: 'llm',
        signature: {
            parameters: [
                {
                    name: 'original_question' as unknown as ToolParameterName,
                    description: 'Value for {{original_question}} in the prompt',
                    schema: {
                        type: 'string',
                        description: 'The original question from the user',
                        is_array: false,
                        fields: {}
                    },
                    required: true
                } as ToolParameter,
                {
                    name: 'improved_question' as unknown as ToolParameterName,
                    description: 'Value for {{improved_question}} in the prompt',
                    schema: {
                        type: 'string',
                        description: 'The improved version of the question',
                        is_array: false,
                        fields: {}
                    },
                    required: true
                } as ToolParameter,
                {
                    name: 'improvement_history' as unknown as ToolParameterName,
                    description: 'Value for {{improvement_history}} in the prompt',
                    schema: {
                        type: 'object',
                        description: 'History of previous improvements',
                        is_array: true,
                        fields: {
                            improvedQuestion: {
                                type: 'string',
                                is_array: false,
                                description: 'An improved version of the question'
                            },
                            explanation: {
                                type: 'string',
                                is_array: false,
                                description: 'Explanation of the improvements made'
                            },
                            evaluation: {
                                type: 'string',
                                is_array: false,
                                description: 'Evaluation of the improvement quality'
                            },
                            confidenceScore: {
                                type: 'number',
                                is_array: false,
                                description: 'Confidence score for the improvement'
                            }
                        }
                    },
                    required: false
                } as ToolParameter
            ],
            outputs: [
                {
                    name: 'response' as unknown as ToolOutputName,
                    description: 'Evaluation of the improved question',
                    schema: {
                        type: 'object',
                        description: 'Evaluation of the improved question',
                        is_array: false,
                        fields: {
                            confidenceScore: {
                                type: 'number',
                                is_array: false,
                                description: 'Confidence score for the question improvement'
                            },
                            evaluation: {
                                type: 'string',
                                is_array: false,
                                description: 'Evaluation of the improvement quality'
                            },
                            improvedQuestion: {
                                type: 'string',
                                is_array: false,
                                description: 'The improved version of the question'
                            },
                            explanation: {
                                type: 'string',
                                is_array: false,
                                description: 'Explanation of the improvements made'
                            }
                        }
                    }
                } as ToolOutput
            ]
        }
    };

    // Create the echo tool
    const echoTool: Tool = {
        tool_id: 'echo',
        name: 'Echo',
        description: 'Echoes the input to the output with option to stringify objects',
        tool_type: 'utility',
        signature: {
            parameters: [
                {
                    name: 'input' as unknown as ToolParameterName,
                    description: 'The input to echo',
                    schema: {
                        type: 'object',
                        description: 'Any input value',
                        is_array: false,
                        fields: {}
                    },
                    required: true
                } as ToolParameter,
                {
                    name: 'stringify' as unknown as ToolParameterName,
                    description: 'Whether to convert objects to JSON strings',
                    schema: {
                        type: 'boolean',
                        description: 'If true, objects will be converted to JSON strings',
                        is_array: false
                    },
                    required: false,
                    default: false
                } as ToolParameter
            ],
            outputs: [
                {
                    name: 'output' as unknown as ToolOutputName,
                    description: 'The echoed output',
                    schema: {
                        type: 'object',
                        description: 'Same as input',
                        is_array: false,
                        fields: {}
                    }
                } as ToolOutput
            ]
        }
    };

    const workflow: AgentWorkflow = {
        workflow_id: workflowId,
        agent_workflow_type: AgentWorkflowType.QUESTION_DEVELOPMENT,
        name: 'Question Development Agent',
        description: 'Improves and refines user questions for better answering',
        status: WorkflowStatus.DRAFT,
        max_iterations: 3,
        confidence_threshold: 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // Define workflow variables
        state: [
            createWorkflowVariable(
                uuidv4(),
                questionVar,
                createBasicSchema('string', 'The original question from the user'),
                'input',
                true
            ),
            createWorkflowVariable(
                uuidv4(),
                improvementResponseVar,
                createObjectSchema({
                    improvedQuestion: createBasicSchema('string', 'The improved and refined question'),
                    explanation: createBasicSchema('string', 'Explanation of the improvements made')
                }, 'Response containing the improved question and explanation'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                responseEvaluationVar,
                createObjectSchema({
                    confidenceScore: createBasicSchema('number', 'Confidence score for the question improvement'),
                    evaluation: createBasicSchema('string', 'Evaluation of the improvement quality'),
                    improvedQuestion: createBasicSchema('string', 'The improved version of the question'),
                    explanation: createBasicSchema('string', 'Explanation of the improvements made')
                }, 'Evaluation of the improvement response'),
                'output'
            ),
            createWorkflowVariable(
                uuidv4(),
                improvementHistoryVar,
                createArraySchema('object', 'History of all improvement attempts'),
                'output'
            )
        ],

        // Define workflow steps
        steps: [
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Improve Question',
                description: 'Generate an improved version of the question',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'llm',
                parameter_mappings: paramMappings,
                output_mappings: outputMappings,
                sequence_number: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tool: llmTool,
                prompt_template_id: 'question-improver'
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Validate Improvement',
                description: 'Validate the quality of the improved question',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'llm',
                parameter_mappings: validatorParamMappings,
                output_mappings: validatorOutputMappings,
                sequence_number: 2,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tool: validatorTool,
                prompt_template_id: 'question-validator'
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Add to History',
                description: 'Add the evaluation to the improvement history',
                step_type: WorkflowStepType.ACTION,
                tool_id: 'echo',
                parameter_mappings: echoParamMappings,
                output_mappings: echoOutputMappings,
                sequence_number: 3,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tool: echoTool
            },
            {
                step_id: uuidv4() as WorkflowStepId,
                workflow_id: workflowId,
                label: 'Evaluate Improvement',
                description: 'Evaluate if the improvement meets quality threshold',
                step_type: WorkflowStepType.EVALUATION,
                parameter_mappings: {},
                output_mappings: {},
                sequence_number: 4,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                evaluation_config: {
                    conditions: [
                        {
                            condition_id: uuidv4(),
                            variable: `${responseEvaluationVar}.confidenceScore` as WorkflowVariableName,
                            operator: 'less_than' as EvaluationOperator,
                            value: 0.7,
                            target_step_index: 0 // Jump back to the Improve Question step (0-based index)
                        }
                    ],
                    default_action: 'continue',
                    maximum_jumps: 3
                }
            }
        ]
    };

    // Initialize the workflow state with default values
    const initialState = workflow.state?.map(variable => {
        if (variable.name === improvementHistoryVar) {
            return {
                ...variable,
                value: [] // Initialize improvement_history as an empty array
            };
        }
        return variable;
    });

    workflow.state = initialState as WorkflowVariable[];

    return workflow;
}; 