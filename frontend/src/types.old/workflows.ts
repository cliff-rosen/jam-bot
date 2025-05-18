import { Tool, ToolParameterName, ToolOutputName } from './tools';
import { Schema, Variable, ValueType, SchemaValueType } from './schema';
import { EvaluationConfig } from './evaluation';

export enum WorkflowStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED'
}

export enum WorkflowStepType {
    ACTION = 'ACTION',
    INPUT = 'INPUT',
    EVALUATION = 'EVALUATION'
}

// Variable roles to distinguish between different types of variables
export enum WorkflowVariableRole {
    // Input roles
    USER_INPUT = 'user_input',         // Input provided by the user
    SYSTEM_INPUT = 'system_input',     // Input provided by the system

    // Output roles
    INTERMEDIATE = 'intermediate',     // Intermediate output used within the workflow
    FINAL = 'final',                   // Final output of the workflow
    DEBUG = 'debug',                   // Output used for debugging purposes
    METADATA = 'metadata',             // Output containing metadata about the workflow

    // Evaluation roles
    EVALUATION_RESULT = 'evaluation_result', // Result of an evaluation step

    // Default role when none is specified
    UNSPECIFIED = 'unspecified'
}

// Operation types for variable assignments
export enum VariableOperationType {
    ASSIGN = 'assign',
    APPEND = 'append'
}

// Type-safe workflow variable references
export type WorkflowVariableName = string & { readonly __brand: unique symbol };

// Enhanced output mapping with operation type
export interface EnhancedOutputMapping {
    variable: WorkflowVariableName;
    operation: VariableOperationType;
}

// Execution result for runtime steps
export interface StepExecutionResult {
    success: boolean;
    error?: string;
    outputs?: Record<WorkflowVariableName, SchemaValueType>;
    inputs?: Record<ToolParameterName, SchemaValueType>;
    updatedState?: WorkflowVariable[];  // Optional updated workflow state
}

// Workflow variable extends base Variable with I/O type and required flag
export interface WorkflowVariable extends Omit<Variable, 'name'> {
    name: WorkflowVariableName;  // Reference name in workflow context
    io_type: 'input' | 'output' | 'evaluation';
    // Required flag only applies to inputs and defaults to true
    required?: boolean;
    // Role of the variable in the workflow context
    // For outputs, this distinguishes between final outputs (results of the workflow)
    // and intermediate outputs (used within the workflow but not part of the final result)
    variable_role?: WorkflowVariableRole;
    value_schema: Schema;
}

// Branded type for workflow step IDs
export type WorkflowStepId = string & { readonly __brand: unique symbol };

// Workflow step definition
export interface WorkflowStep {
    step_id: WorkflowStepId;
    workflow_id: string;
    label: string;
    description: string;
    step_type: WorkflowStepType;
    tool?: Tool;
    tool_id?: string;
    parameter_mappings?: Record<ToolParameterName, WorkflowVariableName>;
    output_mappings?: Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>;
    evaluation_config?: EvaluationConfig;
    sequence_number: number;
    created_at: string;
    updated_at: string;
    prompt_template_id?: string;
}

// Helper functions to work with workflow state
export const getWorkflowInputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v => v.io_type === 'input') ?? [];
};

export const getWorkflowOutputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v => v.io_type === 'output') ?? [];
};

// New helper function to get final outputs
export const getWorkflowFinalOutputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v =>
        v.io_type === 'output' &&
        v.variable_role === WorkflowVariableRole.FINAL
    ) ?? [];
};

// New helper function to get intermediate outputs
export const getWorkflowIntermediateOutputs = (workflow: Workflow): WorkflowVariable[] => {
    return workflow.state?.filter(v =>
        v.io_type === 'output' &&
        v.variable_role === WorkflowVariableRole.INTERMEDIATE
    ) ?? [];
};

// New helper function to get variables by role
export const getWorkflowVariablesByRole = (
    workflow: Workflow,
    role: WorkflowVariableRole
): WorkflowVariable[] => {
    return workflow.state?.filter(v => v.variable_role === role) ?? [];
};

export const addWorkflowVariable = (
    workflow: Workflow,
    variable: WorkflowVariable
): Workflow => {
    return {
        ...workflow,
        state: [...(workflow.state ?? []), variable]
    };
};

// Complete workflow definition
export interface Workflow {
    workflow_id: string;
    name: string;
    description?: string;
    status: WorkflowStatus;
    error?: string;
    created_at?: string;
    updated_at?: string;
    // Combined state array containing both inputs and outputs
    state?: WorkflowVariable[];
    steps: WorkflowStep[];
    nextStepIndex?: number; // The index of the next step to execute (may not be sequential if jumps occur)
}

// Default workflow with empty arrays
export const DEFAULT_WORKFLOW: Workflow = {
    workflow_id: '',
    name: 'Untitled Workflow',
    description: 'A new custom workflow',
    status: WorkflowStatus.DRAFT,
    steps: [],
    state: []
};

// Helper function to create a workflow variable with type safety
export const createWorkflowVariable = (
    variable_id: string,
    name: string,
    schema: Schema,
    io_type: WorkflowVariable['io_type'],
    required: boolean = true,
    variable_role: WorkflowVariableRole = WorkflowVariableRole.UNSPECIFIED
): WorkflowVariable => ({
    variable_id,
    name: name as WorkflowVariableName,
    schema,
    io_type,
    variable_role,
    ...(io_type === 'input' ? { required } : {}),
    value_schema: schema
});

// Helper function to create an array schema
export const createArraySchema = (
    itemType: ValueType,
    description?: string
): Schema => ({
    type: itemType,
    description,
    is_array: true
});

// Helper function to create a basic schema
export const createBasicSchema = (
    type: ValueType,
    description?: string
): Schema => ({
    type,
    description,
    is_array: false
});

// Validation utilities
export const isWorkflowInput = (
    variable: WorkflowVariable
): variable is WorkflowVariable & { io_type: 'input'; required: boolean } => {
    return variable.io_type === 'input';
};

export const isWorkflowOutput = (
    variable: WorkflowVariable
): variable is WorkflowVariable & { io_type: 'output' } => {
    return variable.io_type === 'output';
};

// Type guard for LLM steps
export const isLLMStep = (step: WorkflowStep): step is WorkflowStep & { tool: Tool & { tool_type: 'llm' } } => {
    return step.tool?.tool_type === 'llm';
};

// Helper function to check if a mapping is an enhanced mapping
export const isEnhancedMapping = (mapping: WorkflowVariableName | EnhancedOutputMapping): mapping is EnhancedOutputMapping => {
    return typeof mapping === 'object' && 'variable' in mapping && 'operation' in mapping;
};

// Helper function to get the variable name from a mapping
export const getVariableNameFromMapping = (mapping: WorkflowVariableName | EnhancedOutputMapping): WorkflowVariableName => {
    if (isEnhancedMapping(mapping)) {
        return mapping.variable;
    }
    return mapping;
};

// Helper function to get the operation from a mapping
export const getOperationFromMapping = (mapping: WorkflowVariableName | EnhancedOutputMapping): VariableOperationType => {
    if (isEnhancedMapping(mapping)) {
        return mapping.operation;
    }
    return VariableOperationType.ASSIGN; // Default to assign
};

// Helper function to set the role of a workflow variable
export const setWorkflowVariableRole = (
    variable: WorkflowVariable,
    role: WorkflowVariableRole
): WorkflowVariable => ({
    ...variable,
    variable_role: role
});

// Helper function to mark a workflow variable as a final output
export const markAsFinalOutput = (
    variable: WorkflowVariable
): WorkflowVariable => {
    if (variable.io_type !== 'output') {
        console.warn(`Cannot mark variable ${variable.name} as final output because it is not an output variable`);
        return variable;
    }
    return setWorkflowVariableRole(variable, WorkflowVariableRole.FINAL);
};

// Helper function to mark a workflow variable as an intermediate output
export const markAsIntermediateOutput = (
    variable: WorkflowVariable
): WorkflowVariable => {
    if (variable.io_type !== 'output') {
        console.warn(`Cannot mark variable ${variable.name} as intermediate output because it is not an output variable`);
        return variable;
    }
    return setWorkflowVariableRole(variable, WorkflowVariableRole.INTERMEDIATE);
};

/**
 * Get the signature of a workflow, including its inputs and outputs
 * This is useful for understanding what a workflow expects and produces
 * @param workflow The workflow to get the signature for
 * @returns An object containing the workflow's inputs and outputs
 */
export interface WorkflowSignature {
    // Basic workflow information
    id: string;
    name: string;
    description?: string;

    // Input/output variables
    inputs: WorkflowVariable[];
    outputs: WorkflowVariable[];
    finalOutputs: WorkflowVariable[];

    // Required inputs for validation
    requiredInputs: WorkflowVariable[];

    // Metadata
    stepCount: number;
    hasEvaluationSteps: boolean;
}

export const getWorkflowSignature = (workflow: Workflow): WorkflowSignature => {
    // Get all inputs
    const inputs = getWorkflowInputs(workflow);

    // Get all outputs
    const outputs = getWorkflowOutputs(workflow);

    // Get only final outputs (outputs with FINAL role)
    const finalOutputs = getWorkflowFinalOutputs(workflow);

    // Get required inputs
    const requiredInputs = inputs.filter(input => input.required);

    // Check if the workflow has any evaluation steps
    const hasEvaluationSteps = workflow.steps.some(step =>
        step.step_type === WorkflowStepType.EVALUATION
    );

    return {
        // Basic workflow information
        id: workflow.workflow_id,
        name: workflow.name,
        description: workflow.description,

        // Input/output variables
        inputs,
        outputs,
        finalOutputs,

        // Required inputs for validation
        requiredInputs,

        // Metadata
        stepCount: workflow.steps.length,
        hasEvaluationSteps
    };
};

// Helper function to check if a workflow has all required inputs
export const hasRequiredInputs = (workflow: Workflow, providedInputs: Record<string, any>): boolean => {
    const signature = getWorkflowSignature(workflow);

    // Check if all required inputs are provided
    return signature.inputs
        .filter(input => input.required)
        .every(input => input.name.toString() in providedInputs);
};

// Helper function to check if a workflow has any final outputs
export const hasFinalOutputs = (workflow: Workflow): boolean => {
    const signature = getWorkflowSignature(workflow);
    return signature.finalOutputs.length > 0;
};

/**
 * Get a human-readable representation of a workflow signature
 * Useful for documentation or UI display
 * @param workflow The workflow to get the signature for
 * @returns A string representation of the workflow signature
 */
export const getWorkflowSignatureDescription = (workflow: Workflow): string => {
    const signature = getWorkflowSignature(workflow);

    // Format inputs
    const inputsDescription = signature.inputs.map(input => {
        const requiredMark = input.required ? '*' : '';
        const roleInfo = input.variable_role ? ` (${input.variable_role})` : '';
        const typeInfo = input.schema.is_array
            ? `${input.schema.type}[]`
            : input.schema.type;

        return `${input.name.toString()}${requiredMark}: ${typeInfo}${roleInfo}`;
    }).join('\n');

    // Format outputs
    const outputsDescription = signature.outputs.map(output => {
        const finalMark = output.variable_role === WorkflowVariableRole.FINAL ? ' (FINAL)' : '';
        const typeInfo = output.schema.is_array
            ? `${output.schema.type}[]`
            : output.schema.type;

        return `${output.name.toString()}: ${typeInfo}${finalMark}`;
    }).join('\n');

    // Build the complete description
    return `
Workflow: ${signature.name}
${signature.description ? `Description: ${signature.description}\n` : ''}
Steps: ${signature.stepCount}${signature.hasEvaluationSteps ? ' (includes evaluation steps)' : ''}

Inputs:
${inputsDescription || 'None'}

Outputs:
${outputsDescription || 'None'}

* Required input
    `.trim();
};

/**
 * Get a simplified JSON representation of a workflow signature
 * Useful for API responses or machine-readable formats
 * @param workflow The workflow to get the signature for
 * @returns A simplified JSON object representing the workflow signature
 */
export interface SimpleWorkflowSignature {
    id: string;
    name: string;
    description?: string;
    inputs: {
        name: string;
        type: string;
        required: boolean;
        role?: string;
        description?: string;
    }[];
    outputs: {
        name: string;
        type: string;
        isFinal: boolean;
        role?: string;
        description?: string;
    }[];
    metadata: {
        stepCount: number;
        hasEvaluationSteps: boolean;
    };
}

export const getSimpleWorkflowSignature = (workflow: Workflow): SimpleWorkflowSignature => {
    const signature = getWorkflowSignature(workflow);

    return {
        id: signature.id,
        name: signature.name,
        description: signature.description,
        inputs: signature.inputs.map(input => ({
            name: input.name.toString(),
            type: input.schema.is_array ? `${input.schema.type}[]` : input.schema.type,
            required: !!input.required,
            role: input.variable_role,
            description: input.schema.description
        })),
        outputs: signature.outputs.map(output => ({
            name: output.name.toString(),
            type: output.schema.is_array ? `${output.schema.type}[]` : output.schema.type,
            isFinal: output.variable_role === WorkflowVariableRole.FINAL,
            role: output.variable_role,
            description: output.schema.description
        })),
        metadata: {
            stepCount: signature.stepCount,
            hasEvaluationSteps: signature.hasEvaluationSteps
        }
    };
};

/**
 * Validate inputs against a workflow signature
 * @param workflow The workflow to validate inputs against
 * @param inputs The inputs to validate
 * @returns An object containing validation results
 */
export interface WorkflowInputValidationResult {
    isValid: boolean;
    missingRequiredInputs: string[];
    unknownInputs: string[];
    typeErrors: { name: string; expectedType: string; receivedType: string }[];
}

export const validateWorkflowInputs = (
    workflow: Workflow,
    inputs: Record<string, any>
): WorkflowInputValidationResult => {
    const signature = getWorkflowSignature(workflow);
    const result: WorkflowInputValidationResult = {
        isValid: true,
        missingRequiredInputs: [],
        unknownInputs: [],
        typeErrors: []
    };

    // Check for missing required inputs
    signature.requiredInputs.forEach(input => {
        const inputName = input.name.toString();
        if (!(inputName in inputs)) {
            result.missingRequiredInputs.push(inputName);
            result.isValid = false;
        }
    });

    // Check for unknown inputs
    const knownInputNames = new Set(signature.inputs.map(input => input.name.toString()));
    Object.keys(inputs).forEach(inputName => {
        if (!knownInputNames.has(inputName)) {
            result.unknownInputs.push(inputName);
            // Unknown inputs don't invalidate the workflow, they're just ignored
        }
    });

    // Check for type errors
    signature.inputs.forEach(input => {
        const inputName = input.name.toString();
        if (inputName in inputs) {
            const value = inputs[inputName];
            const expectedType = input.schema.type;

            // Basic type checking
            let typeError = false;

            switch (expectedType) {
                case 'string':
                    typeError = typeof value !== 'string';
                    break;
                case 'number':
                    typeError = typeof value !== 'number';
                    break;
                case 'boolean':
                    typeError = typeof value !== 'boolean';
                    break;
                case 'object':
                    typeError = typeof value !== 'object' || value === null || Array.isArray(value);
                    break;
                // Add more type checks as needed
            }

            // Special handling for arrays
            if (input.schema.is_array) {
                if (!Array.isArray(value)) {
                    typeError = true;
                } else {
                    // Check array item types if needed
                    // This is a simplified check
                }
            }

            if (typeError) {
                result.typeErrors.push({
                    name: inputName,
                    expectedType: input.schema.is_array ? `${expectedType}[]` : expectedType,
                    receivedType: Array.isArray(value) ? 'array' : typeof value
                });
                result.isValid = false;
            }
        }
    });

    return result;
};

