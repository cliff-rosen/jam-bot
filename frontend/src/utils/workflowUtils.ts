import { Schema, ValueType } from '../types/schema';
import { WorkflowVariableName, WorkflowVariable } from '@/types/workflows';

/**
 * Create a workflow variable
 */
export const createWorkflowVariable = (
    variable_id: string,
    name: string,
    schema: Schema,
    io_type: 'input' | 'output' | 'evaluation',
    required: boolean = false
): WorkflowVariable => {
    return {
        variable_id,
        name: name as WorkflowVariableName,
        schema,
        value_schema: schema,
        io_type,
        required
    };
};

/**
 * Create a basic schema for a workflow variable
 */
export const createBasicSchema = (
    type: ValueType,
    description?: string,
    is_array: boolean = false
): Schema => {
    return {
        type,
        description: description || `A ${type} value`,
        is_array
    };
};

/**
 * Create an array schema for a workflow variable
 */
export const createArraySchema = (
    itemType: ValueType,
    description?: string
): Schema => {
    return {
        type: itemType,
        is_array: true,
        description: description || `An array of ${itemType} values`
    };
};

/**
 * Create an object schema for a workflow variable
 */
export const createObjectSchema = (
    fields: Record<string, Schema>,
    description?: string,
    is_array: boolean = false
): Schema => {
    return {
        type: 'object',
        fields,
        is_array,
        description: description || 'An object value'
    };
}; 