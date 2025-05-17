import { describe, test, expect } from 'vitest';
import { WorkflowEngine } from '../workflowEngine';
import { WorkflowVariable, VariableOperationType, WorkflowVariableName } from '../../../types/workflows';
import { Schema } from '../../../types/schema';

// Make the private method accessible for testing
// @ts-ignore - Accessing private method for testing
const applyOutputToVariable = WorkflowEngine['applyOutputToVariable'];

// Constants used in tests
const APPEND_DELIMITER = '\n\n'; // This should match the delimiter used in the actual implementation

// Helper to create a WorkflowVariableName from a string
const createVarName = (name: string): WorkflowVariableName => {
    return name as unknown as WorkflowVariableName;
};

describe('WorkflowEngine.applyOutputToVariable', () => {
    // Helper function to create a workflow variable
    const createVariable = (
        value: any,
        type: string = 'string',
        isArray: boolean = false
    ): WorkflowVariable => ({
        variable_id: 'test-var-id',
        name: createVarName('testVar'),
        value,
        schema: { type, is_array: isArray } as Schema,
        io_type: 'output'
    });

    // String Variable Tests
    describe('String Variable', () => {
        // String to String
        test('ASSIGN: string to string - direct assignment', () => {
            const variable = createVariable('original');
            const mapping = createVarName('simple-mapping'); // Simple string mapping
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toBe('new value');
        });

        test('APPEND: string to string - concatenate with delimiter', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const result = applyOutputToVariable(variable, mapping, 'appended');
            expect(result).toBe(`original${APPEND_DELIMITER}appended`);
        });

        // String Array to String
        test('ASSIGN: string[] to string - converts array to string', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const result = applyOutputToVariable(variable, mapping, ['one', 'two', 'three']);
            // The implementation now converts the array to a string by joining elements
            expect(typeof result).toBe('string');
            expect(result).toBe('one,two,three');
        });

        test('APPEND: string[] to string - append array as string representation', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const result = applyOutputToVariable(variable, mapping, ['one', 'two']);
            // The implementation converts array to string using toString()
            expect(result).toBe(`original${APPEND_DELIMITER}one,two`);
            expect(typeof result).toBe('string');
        });

        // Object to String
        test('ASSIGN: object to string - converts object to JSON string', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const obj = { key: 'value', num: 42 };
            const result = applyOutputToVariable(variable, mapping, obj);
            // The implementation now converts the object to a JSON string
            expect(typeof result).toBe('string');
            expect(result).toBe(JSON.stringify(obj));
        });

        test('APPEND: object to string - append object as string representation', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const obj = { key: 'value', num: 42 };
            const result = applyOutputToVariable(variable, mapping, obj);
            // The implementation converts object to string using toString()
            expect(result).toBe(`original${APPEND_DELIMITER}[object Object]`);
            expect(typeof result).toBe('string');
        });

        // Object Array to String
        test('ASSIGN: object[] to string - converts array to string', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const objArray = [{ id: 1 }, { id: 2 }];
            const result = applyOutputToVariable(variable, mapping, objArray);
            // The implementation now converts the array to a string by joining elements
            expect(typeof result).toBe('string');
            // The objects in the array will be converted to [object Object]
            expect(result).toBe('[object Object],[object Object]');
        });

        test('APPEND: object[] to string - append array as string representation', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const objArray = [{ id: 1 }, { id: 2 }];
            const result = applyOutputToVariable(variable, mapping, objArray);
            // The implementation converts array to string using toString()
            expect(result).toBe(`original${APPEND_DELIMITER}[object Object],[object Object]`);
            expect(typeof result).toBe('string');
        });
    });

    // String Array Variable Tests
    describe('String Array Variable', () => {
        // String to String Array
        test('ASSIGN: string to string[] - converts string to array', () => {
            const variable = createVariable([], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const result = applyOutputToVariable(variable, mapping, 'new value');
            // The implementation now converts the string to an array with a single element
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['new value']);
        });

        test('APPEND: string to string[] - append string as a single element', () => {
            const variable = createVariable(['existing'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            // The implementation now appends the string as a single element
            const result = applyOutputToVariable(variable, mapping, 'appended');
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['existing', 'appended']);
        });

        // String Array to String Array
        test('ASSIGN: string[] to string[] - direct assignment', () => {
            const variable = createVariable(['original'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const result = applyOutputToVariable(variable, mapping, ['new', 'values']);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['new', 'values']);
        });

        test('APPEND: string[] to string[] - append all elements', () => {
            const variable = createVariable(['original'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const result = applyOutputToVariable(variable, mapping, ['appended', 'values']);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['original', 'appended', 'values']);
        });

        // Object to String Array
        test('ASSIGN: object to string[] - converts object to array', () => {
            const variable = createVariable([], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const obj = { key: 'value' };
            const result = applyOutputToVariable(variable, mapping, obj);
            // The implementation now converts the object to an array with a single element
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([obj]);
        });

        test('APPEND: object to string[] - append object as a single element', () => {
            const variable = createVariable(['existing'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const obj = { key: 'value' };

            // The implementation now appends the object as a single element
            const result = applyOutputToVariable(variable, mapping, obj);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['existing', obj]);
        });

        // Object Array to String Array
        test('ASSIGN: object[] to string[] - direct assignment', () => {
            const variable = createVariable(['original'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.ASSIGN
            };
            const objArray = [{ id: 1 }, { id: 2 }];
            const result = applyOutputToVariable(variable, mapping, objArray);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(objArray);
        });

        test('APPEND: object[] to string[] - append all objects as elements', () => {
            const variable = createVariable(['original'], 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const objArray = [{ id: 1 }, { id: 2 }];
            const result = applyOutputToVariable(variable, mapping, objArray);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['original', { id: 1 }, { id: 2 }]);
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        // Simple string mapping (non-object)
        test('Simple string mapping returns output value unchanged', () => {
            const variable = createVariable('original');
            const mapping = createVarName('simple-mapping'); // Simple string mapping
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toBe('new value');
        });

        // Invalid enhanced mapping
        test('Invalid enhanced mapping (missing operation) returns output unchanged', () => {
            const variable = createVariable('original');
            // We need to cast this to any since it's intentionally invalid for testing
            const mapping = { variable: createVarName('testVar') } as any;
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toBe('new value');
        });

        test('Invalid enhanced mapping (missing variable) returns output unchanged', () => {
            const variable = createVariable('original');
            // We need to cast this to any since it's intentionally invalid for testing
            const mapping = { operation: VariableOperationType.ASSIGN } as any;
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toBe('new value');
        });

        // Null/undefined values
        test('Null variable value with APPEND to array creates new array', () => {
            const variable = createVariable(null, 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toEqual(['new value']);
        });

        test('Undefined variable value with APPEND to array creates new array', () => {
            const variable = createVariable(undefined, 'string', true);
            const mapping = {
                variable: createVarName('testVar'),
                operation: VariableOperationType.APPEND
            };
            const result = applyOutputToVariable(variable, mapping, 'new value');
            expect(result).toEqual(['new value']);
        });

        // Unknown operation type
        test('Unknown operation type returns undefined or falls back to default', () => {
            const variable = createVariable('original');
            const mapping = {
                variable: createVarName('testVar'),
                operation: 'UNKNOWN_OPERATION' as any
            };
            const result = applyOutputToVariable(variable, mapping, 'new value');
            // Depending on implementation, this might return undefined or fall back to a default
            expect(result).toBe(undefined);
        });
    });
}); 