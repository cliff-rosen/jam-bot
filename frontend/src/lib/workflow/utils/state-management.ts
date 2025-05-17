import { WorkflowVariable } from '../../../types/workflows';

/**
 * Updates a workflow state with input values based on a mapping
 * @param state Current state variables
 * @param inputs Input values as key-value pairs
 * @param inputMappings Maps from new variable space to previous variable space
 * @returns Updated state variables
 */
export function updateStateWithInputs<T extends WorkflowVariable>(
    state: T[],
    inputs: Record<string, any>,
    inputMappings: Record<string, string>
): T[] {
    return state.map(variable => {
        // Find if this variable has a mapping
        const inputVarName = Object.entries(inputMappings)
            .find(([newVar, prevVar]) => newVar === variable.name)?.[1];

        if (inputVarName && inputVarName in inputs) {
            return {
                ...variable,
                value: inputs[inputVarName]
            };
        }
        return variable;
    });
}

/**
 * Updates a workflow state with output values based on a mapping
 * @param state Current state variables
 * @param outputs Output values as key-value pairs
 * @param outputMappings Maps from previous variable space to new variable space
 * @returns Updated state variables
 */
export function updateStateWithOutputs<T extends WorkflowVariable>(
    state: T[],
    outputs: Record<string, any>,
    outputMappings: Record<string, string>
): T[] {
    console.log('qqq outputs', outputs);
    console.log('qqq outputMappings', outputMappings);
    console.log('qqq state', state);

    return state.map(variable => {
        // Find if this variable has a mapping (match on prevVar)
        const outputVarName = Object.entries(outputMappings)
            .find(([newVar, prevVar]) => prevVar === variable.name)?.[0];

        console.log('qqq outputVarName', outputVarName);
        // Make sure outputVar name is in outputs with name as key
        if (outputVarName && outputVarName in outputs ) {
            return {
                ...variable,
                value: outputs[outputVarName]
            };
        }
        return variable;
    });
}

/**
 * Converts workflow variables to a simple record
 * @param variables Array of workflow variables
 * @returns Record of variable names to values
 */
export function variablesToRecord(variables: WorkflowVariable[]): Record<string, any> {
    return variables.reduce((acc, v) => ({
        ...acc,
        [v.name]: v.value
    }), {} as Record<string, any>);
}

/**
 * Creates an identity mapping for a set of keys
 * @param keys Array of keys to map
 * @returns Record mapping each key to itself
 */
export function createIdentityMapping(keys: string[]): Record<string, string> {
    return Object.fromEntries(keys.map(k => [k, k]));
} 

