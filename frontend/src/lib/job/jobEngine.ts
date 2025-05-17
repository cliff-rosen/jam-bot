import {
    Job,
    JobStatus,
    StepExecutionResult
} from '../../types/jobs';
import {
    WorkflowEngine
} from '../workflow/workflowEngine';
import {
    Workflow,
    WorkflowStep,
    WorkflowVariable,
    WorkflowVariableName,
    WorkflowStepType,
    WorkflowStatus,
    StepExecutionResult as WorkflowStepResult,
    EvaluationResult
} from '../../types/workflows';
import { Schema, SchemaValueType, ValueType } from '../../types/schema';
import { Tool, ToolOutputName, ToolParameterName } from '../../types/tools';
import { parseVariablePath, resolvePropertyPath, findVariableByRootName, validateAndResolveVariablePath } from '../utils/variablePathUtils';

/**
 * JobState represents the combined state of a job's variables and execution progress
 */
export interface JobState {
    stepResults: StepExecutionResult[];
    currentStepIndex: number;
}

/**
 * JobEngine is a wrapper around WorkflowEngine that operates on Job objects directly
 * This provides a cleaner interface for job execution and state management
 */
export class JobEngine {
    /**
     * Execute a single step of a job
     * @param job The job to execute
     * @param stepIndex The index of the step to execute
     * @returns An object containing:
     *   - updatedState: The complete updated workflow state with all variable changes
     *   - result: The execution result for the step
     *   - nextStepIndex: The index of the next step to execute (may not be sequential for jumps)
     * 
     * Note: The updatedState contains all state changes including variable updates from tool outputs
     * and evaluation results. It should be used to update the job's state directly.
     */
    static async executeStep(
        job: Job,
        stepIndex: number
    ): Promise<{
        updatedState: WorkflowVariable[];
        result: StepExecutionResult;
        nextStepIndex: number;
    }> {
        try {
            // First check and fix any missing variables
            job = this.checkAndFixMissingVariables(job);

            // Validate variable mappings before execution
            const validationErrors = this.validateVariableMappings(job, stepIndex);
            if (validationErrors.length > 0) {
                throw new Error(`Variable mapping validation failed:\n${validationErrors.join('\n')}`);
            }

            // Convert job to workflow for WorkflowEngine
            const workflow = this.jobToWorkflow(job);

            // Capture input values before execution
            const inputValues = this.getResolvedStepInputs(job, stepIndex);

            // Execute the step using WorkflowEngine - this already handles all state updates and jump logic
            const { updatedState, result, nextStepIndex } = await WorkflowEngine.executeStepSimple(
                workflow,
                stepIndex
            );

            console.log('executeStep', {
                updatedState,
                result,
                nextStepIndex
            });

            // Create step execution record with proper job step result type
            const stepExecutionResult: StepExecutionResult = {
                ...result,
                inputs: inputValues, // Include captured input values
                step_id: job.steps[stepIndex].step_id,
                started_at: job.steps[stepIndex].started_at || new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Return the results directly from executeStepSimple
            return {
                updatedState,
                result: stepExecutionResult,
                nextStepIndex
            };
        } catch (error) {
            // Handle step execution error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Try to capture input values even in case of error
            let inputValues = {};
            try {
                inputValues = this.getResolvedStepInputs(job, stepIndex);
            } catch (e) {
                console.error('Failed to capture input values for failed step:', e);
            }

            // Create failed step result with proper job step result type
            const failedResult: StepExecutionResult = {
                success: false,
                error: errorMessage,
                outputs: {},
                inputs: inputValues, // Include captured input values
                step_id: job.steps[stepIndex].step_id,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            };

            // Return the current job state - this preserves all variables including evaluation variables
            return {
                updatedState: job.state,
                result: failedResult,
                nextStepIndex: stepIndex + 1
            };
        }
    }


    /**
     * Update a job with the results of a step execution
     * @param job The job to update
     * @param stepIndex The index of the step that was executed
     * @param result The result of the step execution
     * @param nextStepIndex The index of the next step to execute
     * @returns The updated job
     */
    static getUpdatedJobWithStepResult(
        job: Job,
        stepIndex: number,
        result: WorkflowStepResult,
        nextStepIndex: number
    ): Job {
        // Create a copy of the job to avoid mutating the original
        const updatedJob = { ...job };

        // Capture input values for the step
        const inputValues = this.getResolvedStepInputs(job, stepIndex);

        // Create step execution record
        const stepExecutionResult: StepExecutionResult = {
            ...result,
            inputs: inputValues, // Include captured input values
            step_id: job.steps[stepIndex].step_id,
            started_at: job.steps[stepIndex].started_at || new Date().toISOString(),
            completed_at: new Date().toISOString()
        };

        // Update the step with the result
        updatedJob.steps = [...job.steps];
        updatedJob.steps[stepIndex] = {
            ...updatedJob.steps[stepIndex],
            status: result.success ? JobStatus.COMPLETED : JobStatus.FAILED,
            completed_at: new Date().toISOString(),
            error_message: result.error,
            latest_execution: stepExecutionResult,
            executions: [
                ...(updatedJob.steps[stepIndex].executions || []),
                stepExecutionResult
            ]
        };

        // Update job execution progress
        updatedJob.execution_progress = {
            current_step: nextStepIndex,
            total_steps: job.steps.length
        };

        // Update job status if all steps are completed or if there was an error
        if (nextStepIndex >= job.steps.length) {
            updatedJob.status = JobStatus.COMPLETED;
            updatedJob.completed_at = new Date().toISOString();
        } else if (!result.success) {
            updatedJob.status = JobStatus.FAILED;
            updatedJob.error_message = result.error;
        }

        return updatedJob;
    }

    /**
     * Convert a job to a workflow for use with WorkflowEngine
     * @param job The job to convert
     * @returns A workflow representation of the job
     */
    static jobToWorkflow(job: Job): Workflow {
        // Convert job steps to workflow steps
        const workflowSteps = job.steps.map((step, index) => ({
            step_id: step.step_id,
            workflow_id: job.workflow_id,
            label: step.label,
            description: step.description,
            step_type: step.step_type,
            tool: step.tool,
            tool_id: step.tool_id,
            parameter_mappings: step.parameter_mappings || {},
            output_mappings: step.output_mappings || {},
            sequence_number: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            evaluation_config: step.evaluation_config,
            prompt_template_id: step.prompt_template_id
        })) as unknown as WorkflowStep[];

        // Process state variables, ensuring no duplicates
        const processedVarNames = new Set<string>();
        const workflowState: WorkflowVariable[] = [];

        // Include ALL variables from job state, regardless of type
        // This ensures evaluation variables and jump counters are preserved
        job.state.forEach(variable => {
            if (!processedVarNames.has(variable.name)) {
                processedVarNames.add(variable.name);
                workflowState.push(this.ensureWorkflowVariable(variable));
            }
        });

        // Create workflow
        return {
            workflow_id: job.workflow_id,
            name: job.name,
            description: job.description,
            status: WorkflowStatus.PUBLISHED,
            steps: workflowSteps,
            state: workflowState
        };
    }

    /**
     * Ensure a variable has all required workflow variable properties
     * Preserves the original io_type if present, especially important for evaluation variables
     */
    private static ensureWorkflowVariable(variable: Partial<WorkflowVariable>): WorkflowVariable {
        return {
            ...variable,
            variable_id: variable.variable_id || variable.name,
            schema: variable.schema || this.inferSchema(variable.value),
            io_type: variable.io_type || 'output'
        } as WorkflowVariable;
    }

    /**
     * Convert workflow state to job variables
     * @param workflowState The workflow state
     * @returns Record of variable names to values
     */
    static workflowStateToJobVariables(
        workflowState: WorkflowVariable[]
    ): Record<WorkflowVariableName, SchemaValueType> {
        // Convert workflow state to job variables
        const variables: Record<WorkflowVariableName, SchemaValueType> = {};

        workflowState.forEach(variable => {
            if (variable.name) {
                variables[variable.name] = variable.value as SchemaValueType;
            }
        });

        return variables;
    }

    /**
     * Initialize a job with input variables
     * @param job The job to initialize
     * @param inputVariables The input variables
     * @returns The initialized job
     */
    static initializeJobWithInputs(
        job: Job,
        inputVariables: Record<WorkflowVariableName, SchemaValueType>
    ): Job {
        // Validate input variables against job's input_variables definitions
        const errors: string[] = [];

        if (job.input_variables) {
            job.input_variables.forEach(inputVar => {
                const value = inputVariables[inputVar.name];

                // Check required inputs
                if (inputVar.required && (value === undefined || value === null)) {
                    errors.push(`Required input variable "${inputVar.name}" is missing`);
                    return;
                }

                // Check type compatibility if value is provided
                if (value !== undefined && value !== null) {
                    const valueSchema = this.inferSchema(value);
                    if (!this.isSchemaCompatible(inputVar.schema, valueSchema)) {
                        errors.push(`Input variable "${inputVar.name}" type mismatch - expected ${JSON.stringify(inputVar.schema)}, got ${JSON.stringify(valueSchema)}`);
                    }
                }
            });
        }

        if (errors.length > 0) {
            throw new Error(`Input validation failed:\n${errors.join('\n')}`);
        }

        // Start with existing non-input state variables
        const updatedState = job.state.filter(v => v.io_type !== 'input');

        // Convert and add input variables
        Object.entries(inputVariables).forEach(([name, value]) => {
            // Find existing variable definition
            const varDef = job.input_variables?.find(v => v.name === name);

            const inputVar = {
                name: name as WorkflowVariableName,
                variable_id: name,
                value: value,
                io_type: 'input' as const,
                schema: varDef?.schema || this.inferSchema(value)
            };

            updatedState.push(inputVar);
        });

        return {
            ...job,
            state: updatedState
        };
    }

    /**
     * Checks for missing variables in job state and attempts to fix them
     * @param job The job to check
     * @returns The job with fixed state if possible
     */
    static checkAndFixMissingVariables(job: Job): Job {
        // Create a map of all variables that should be created by output mappings
        const expectedVariables = new Map<string, {
            stepId: string,
            outputName: string,
            schema?: Schema // Add schema information
        }>();

        // Collect all output mappings from all steps
        job.steps.forEach(step => {
            if (step.output_mappings) {
                Object.entries(step.output_mappings).forEach(([outputName, varName]) => {
                    // Try to get the schema from the tool's output signature if available
                    let schema: Schema | undefined;
                    if (step.tool?.signature?.outputs) {
                        const outputDef = step.tool.signature.outputs.find(o => o.name === outputName);
                        if (outputDef) {
                            schema = outputDef.schema;
                        }
                    }

                    expectedVariables.set(varName as string, {
                        stepId: step.step_id,
                        outputName,
                        schema
                    });
                });
            }
        });

        // Check if any expected variables are missing from job state
        const missingVariables = Array.from(expectedVariables.keys())
            .filter(varName => !job.state.some(v => v.name === varName));

        if (missingVariables.length === 0) {
            return job; // No missing variables, return job as is
        }

        console.log('Found missing variables in job state:', missingVariables);

        // Create a copy of job state to modify
        const updatedState = [...job.state];

        // Add placeholder values for missing variables
        missingVariables.forEach(varName => {
            const { stepId, outputName, schema } = expectedVariables.get(varName)!;
            console.log(`Adding placeholder for missing variable "${varName}" from step ${stepId}, output "${outputName}"`);

            // Create a placeholder variable with appropriate default value based on schema
            let defaultValue: SchemaValueType = '';
            let defaultSchema: Schema = { type: 'string', is_array: false };

            if (schema) {
                defaultSchema = schema;
                // Create appropriate default value based on schema type
                if (schema.is_array) {
                    defaultValue = [] as any; // Cast to any to avoid type error
                } else if (schema.type === 'object') {
                    defaultValue = {};
                } else if (schema.type === 'number') {
                    defaultValue = 0;
                } else if (schema.type === 'boolean') {
                    defaultValue = false;
                }
                // String and file types default to empty string
            }

            updatedState.push({
                name: varName as WorkflowVariableName,
                variable_id: varName,
                value: defaultValue,
                io_type: 'output',
                schema: defaultSchema
            });
        });

        return {
            ...job,
            state: updatedState
        };
    }

    /**
     * Validate variable mappings for a given step
     * @param job The job containing the step
     * @param stepIndex The index of the step to validate
     * @returns Array of validation errors, empty if valid
     */
    static validateVariableMappings(job: Job, stepIndex: number): string[] {
        // We no longer need to call checkAndFixMissingVariables here
        // since it's already called in executeStep

        const errors: string[] = [];
        const step = job.steps[stepIndex];

        if (!step.tool) return errors;

        // Debug logging to help diagnose the issue
        console.log(`Validating variable mappings for step ${stepIndex + 1} (${step.step_id}):`);
        console.log('- Parameter mappings:', step.parameter_mappings);
        console.log('- Current job state variables:', job.state.map(v => ({
            name: v.name,
            type: v.schema.type,
            isArray: v.schema.is_array,
            valueType: v.value ? typeof v.value : 'undefined'
        })));

        // Validate parameter mappings for the current step
        step.tool.signature.parameters.forEach(param => {
            const mappedVarPath = step.parameter_mappings[param.name];
            if (param.required && !mappedVarPath) {
                errors.push(`Step ${stepIndex + 1}: Required parameter "${param.name}" is not mapped`);
                return;
            }

            if (mappedVarPath) {
                // Parse the variable path
                const { rootName, propPath } = parseVariablePath(String(mappedVarPath));
                const stateVar = findVariableByRootName(job.state, rootName);

                // Check if the root variable exists in job state
                if (!stateVar) {
                    errors.push(`Step ${stepIndex + 1}: Parameter "${param.name}" is mapped to variable "${rootName}" which does not exist in job state`);
                    console.log(`ERROR: Variable "${rootName}" not found in job state for parameter "${param.name}"`);
                    return;
                }

                console.log(`Validating mapping for parameter "${param.name}" -> "${mappedVarPath}":`, {
                    variableSchema: stateVar.schema,
                    variableValue: stateVar.value,
                    parameterSchema: param.schema,
                    propPath
                });

                // Use utility to validate and resolve the variable path
                const validation = validateAndResolveVariablePath(stateVar, propPath);

                if (!validation.valid) {
                    const errorMsg = validation.errorMessage || `Invalid path "${mappedVarPath}"`;
                    errors.push(`Step ${stepIndex + 1}: ${errorMsg}`);
                    console.log(`ERROR: Invalid path for parameter "${param.name}":`, {
                        error: errorMsg,
                        variable: stateVar,
                        propPath
                    });
                    return;
                }

                // Check type compatibility
                if (validation.schema && !this.isSchemaCompatible(param.schema, validation.schema)) {
                    const error = `Step ${stepIndex + 1}: Parameter "${param.name}" type mismatch with "${mappedVarPath}" - expected ${JSON.stringify(param.schema)}, got ${JSON.stringify(validation.schema)}`;
                    errors.push(error);
                    console.log(`ERROR: Type mismatch for parameter "${param.name}":`, {
                        parameterSchema: param.schema,
                        variableSchema: validation.schema
                    });
                }
            }
        });

        return errors;
    }

    /**
     * Check if two schemas are compatible
     * Allows array of strings to be compatible with string by joining with newlines
     */
    private static isSchemaCompatible(schema1: Schema, schema2: Schema): boolean {
        // Special case: allow array of strings to be compatible with string
        if (schema1.type === 'string' && !schema1.is_array &&
            schema2.type === 'string' && schema2.is_array) {
            return true;
        }

        // Basic type compatibility
        if (schema1.type !== schema2.type) return false;

        // Array compatibility (except for the special case above)
        if (schema1.is_array !== schema2.is_array) return false;

        return true;
    }


    /**
     * Infer schema from a value
     */
    private static inferSchema(value: any): Schema {
        let type: ValueType = 'string';
        let isArray = Array.isArray(value);

        if (value !== null && value !== undefined) {
            if (typeof value === 'number') type = 'number';
            else if (typeof value === 'boolean') type = 'boolean';
            else if (typeof value === 'object') {
                if (value && 'file_id' in value) {
                    type = 'file';
                } else if (!isArray) {
                    type = 'object';
                }
            }
        }

        return {
            type,
            is_array: isArray
        };
    }

    /**
     * Get all input variables from a job
     * @param job The job to get input variables from
     * @returns Array of input variables
     */
    static getInputVariables(job: Job): WorkflowVariable[] {
        return job.state.filter(variable => variable.io_type === 'input');
    }

    /**
     * Get final output variables from a job (only from the final step)
     * @param job The job to get output variables from
     * @returns Array of final output variables
     */
    static getFinalOutputVariables(job: Job): WorkflowVariable[] {
        // No steps means no outputs to filter
        if (!job.steps || job.steps.length === 0) {
            return [];
        }

        // Get the last step's output mappings
        const lastStep = job.steps[job.steps.length - 1];

        // If no output mappings, return empty array
        if (!lastStep.output_mappings) {
            return [];
        }

        // Get the variable names that receive the outputs
        const finalOutputVarNames = Object.values(lastStep.output_mappings)
            .map(name => name.toString());

        // Filter state variables to only include those in the final output mappings
        return job.state.filter(variable =>
            variable.io_type === 'output' &&
            !variable.name.toString().startsWith('__eval_') &&
            finalOutputVarNames.includes(variable.name.toString())
        );
    }

    /**
     * Get all state variables from a job, excluding evaluation variables
     * @param job The job to get state variables from
     * @returns Array of all state variables
     */
    static getAllStateVariables(job: Job): WorkflowVariable[] {
        return job.state.filter(variable =>
            !variable.name.toString().startsWith('__eval_')
        );
    }

    /**
     * Get input mappings for a specific step with their resolved values
     * @param job The job containing the step
     * @param stepId The ID of the step to get input mappings for
     * @returns Array of input mappings with variable names and resolved values
     */
    static getStepInputMappings(job: Job, stepId: string) {
        const step = job.steps.find(s => s.step_id === stepId);

        if (!step?.parameter_mappings) {
            return [];
        }

        return Object.entries(step.parameter_mappings).map(([paramName, varPathSpec]) => {
            // Parse the variable path into a root name and property path
            const { rootName, propPath } = parseVariablePath(varPathSpec.toString());

            // Get the root variable from the job state
            const rootVar = findVariableByRootName(job.state || [], rootName);
            let varValue = undefined;

            if (rootVar?.value !== undefined) {
                if (propPath.length === 0) {
                    // Direct mapping
                    varValue = rootVar.value;
                } else {
                    // Use utility to resolve property path
                    const { value, validPath } = resolvePropertyPath(rootVar.value, propPath);
                    if (validPath) {
                        varValue = value;
                    }
                }
            }

            return {
                paramName,
                varName: varPathSpec,
                paramLabel: varPathSpec as string,
                value: varValue
            };
        });
    }

    /**
     * Get output mappings for a specific step execution result
     * @param job The job containing the step
     * @param stepId The ID of the step to get output mappings for
     * @param outputs The outputs from the step execution
     * @returns Array of output mappings with variable names and values
     */
    static getStepOutputMappings(job: Job, stepId: string, outputs?: Record<WorkflowVariableName, SchemaValueType>) {
        const step = job.steps.find(s => s.step_id === stepId);

        if (!step?.output_mappings || !outputs) {
            return [];
        }

        return Object.entries(step.output_mappings).map(([outputName, varPathSpec]) => {
            const outputValue = outputs[outputName as WorkflowVariableName];

            // Parse the variable path into root name and property path
            const { rootName, propPath } = parseVariablePath(varPathSpec.toString());

            let targetVariable: WorkflowVariable | undefined = job.state?.find(v => v.name === rootName);

            // If variable doesn't exist yet, we'll create it during execution
            // For now, just return the mapping information
            if (!targetVariable) {
                return {
                    outputName,
                    varName: varPathSpec,
                    outputLabel: varPathSpec as string,
                    value: outputValue
                };
            }

            // For property paths, we need to handle updating a specific part of the value
            if (propPath.length > 0 && targetVariable.value !== undefined) {
                // This information will be used by the step execution to update the nested property
                return {
                    outputName,
                    varName: varPathSpec,
                    outputLabel: varPathSpec as string,
                    value: outputValue,
                    rootName,
                    propPath
                };
            }

            return {
                outputName,
                varName: varPathSpec,
                outputLabel: varPathSpec as string,
                value: outputValue
            };
        });
    }

    /**
     * Get resolved step inputs for a given step
     * @param job The job containing the step
     * @param stepIndex The index of the step to get inputs for
     * @returns Record of input names to resolved values
     */
    static getResolvedStepInputs(job: Job, stepIndex: number): Record<string, any> {
        const step = job.steps[stepIndex];
        const inputs: Record<string, any> = {};

        if (step.parameter_mappings) {
            Object.entries(step.parameter_mappings).forEach(([paramName, varPathSpec]) => {
                // Parse the variable path into a root name and property path
                const { rootName, propPath } = parseVariablePath(varPathSpec.toString());

                // Get the root variable from the job state
                const rootVar = findVariableByRootName(job.state || [], rootName);
                let varValue = undefined;

                if (rootVar?.value !== undefined) {
                    if (propPath.length === 0) {
                        // Direct mapping
                        varValue = rootVar.value;
                    } else {
                        // Use utility to resolve property path
                        const { value, validPath } = resolvePropertyPath(rootVar.value, propPath);
                        if (validPath) {
                            varValue = value;
                        }
                    }
                }

                inputs[paramName] = varValue;
            });
        }

        return inputs;
    }

    /**
     * Get input mappings for a specific step with their resolved values from historical step execution result
     * @param job The job containing the step
     * @param stepId The ID of the step to get input mappings for
     * @param stepResult The historical step execution result
     * @returns Array of input mappings with variable names and resolved values from history
     */
    static getStepInputMappingsFromHistory(job: Job, stepId: string, stepResult: StepExecutionResult) {
        const step = job.steps.find(s => s.step_id === stepId);

        if (!step?.parameter_mappings) {
            return [];
        }

        // If we have captured input values in the result, use them
        if (stepResult.inputs) {
            return Object.entries(step.parameter_mappings).map(([paramName, varPathSpec]) => {
                return {
                    paramName,
                    varName: varPathSpec,
                    paramLabel: varPathSpec as string,
                    // Use the captured input value from the step execution result
                    value: stepResult.inputs?.[paramName as ToolParameterName]
                };
            });
        }

        // Fallback to current values if historical values are not available
        return this.getStepInputMappings(job, stepId);
    }

    /**
     * Get output mappings for a specific step with their resolved values from historical step execution result
     * @param job The job containing the step
     * @param stepId The ID of the step to get output mappings for
     * @param stepResult The historical step execution result
     * @returns Array of output mappings with variable names and values from history
     */
    static getStepOutputMappingsFromHistory(job: Job, stepId: string, stepResult: StepExecutionResult) {
        const step = job.steps.find(s => s.step_id === stepId);

        if (!step?.output_mappings || !stepResult.outputs) {
            return [];
        }

        return Object.entries(step.output_mappings).map(([outputName, varPathSpec]) => {
            return {
                outputName,
                varName: varPathSpec,
                outputLabel: varPathSpec as string,
                // Use the output value from the step execution result
                value: stepResult.outputs?.[outputName as WorkflowVariableName]
            };
        });
    }
} 