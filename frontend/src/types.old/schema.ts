// Basic type definitions
export type PrimitiveType = 'string' | 'number' | 'boolean';
export type ComplexType = 'object' | 'file';
export type ValueType = PrimitiveType | ComplexType;

// Core schema definition that describes the shape/structure of a value
export interface Schema {
    type: ValueType;
    description?: string;
    is_array: boolean;  // If true, the value will be an array of the base type
    // Only used for object type
    fields?: Record<string, Schema>;
    // Format constraints
    format?: string;
    content_types?: string[];
}

// Runtime value for files
export interface FileValue {
    file_id: string;
    name: string;
    description?: string;
    content: Uint8Array;
    mime_type: string;
    size: number;
    extracted_text?: string;
    created_at: string;
    updated_at: string;
}

// Type helper for object values - more precise field definitions
export type SchemaObjectType = {
    [key: string]: SchemaValueType | Array<SchemaValueType>;
};

// Runtime value type for any schema
export type SchemaValueType =
    | string
    | number
    | boolean
    | SchemaObjectType
    | FileValue;

// Branded type for type-safe variable references
export type VariableName = string & { readonly __brand: unique symbol };

// Base variable type - combines schema with identifiers and value
export interface Variable {
    variable_id: string;     // System-wide unique ID
    name: VariableName;      // Reference name in current context
    schema: Schema;          // Structure definition
    value?: SchemaValueType; // Actual data
    description?: string;    // Human-readable description
}

// Schema validation utilities
export const isArrayValue = (schema: Schema, value: unknown): value is Array<any> => {
    return schema.is_array && Array.isArray(value);
};

export const isObjectValue = (schema: Schema, value: unknown): value is SchemaObjectType => {
    return schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isFileValue = (schema: Schema, value: unknown): value is FileValue => {
    return schema.type === 'file' && typeof value === 'object' && value !== null && 'file_id' in value;
};

// Schema validation helper
export const validateSchemaValue = (schema: Schema, value: unknown): value is SchemaValueType => {
    if (schema.is_array) {
        if (!Array.isArray(value)) return false;
        return value.every(item => validateSchemaValue({ ...schema, is_array: false }, item));
    }

    switch (schema.type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number';
        case 'boolean':
            return typeof value === 'boolean';
        case 'object':
            if (!isObjectValue(schema, value)) return false;
            if (!schema.fields) return true;
            return Object.entries(schema.fields).every(([key, fieldSchema]) => {
                return key in value && validateSchemaValue(fieldSchema, value[key]);
            });
        case 'file':
            return isFileValue(schema, value);
        default:
            return false;
    }
};