import { Schema, SchemaValueType } from "../../types/schema";
import { WorkflowVariable } from "../../types/workflows";

/**
 * Parses a variable path into root variable name and property path
 * @param variablePath The full variable path (e.g., "address.city.name")
 * @returns Object containing rootName and propPath
 */
export function parseVariablePath(variablePath: string): { rootName: string; propPath: string[] } {
    const [rootName, ...propPath] = variablePath.toString().split(".");
    return { rootName, propPath };
}

/**
 * Finds a variable in the state by root name
 * @param variables Array of variables to search
 * @param rootName Root name of the variable to find
 * @returns The found variable or undefined
 */
export function findVariableByRootName(
    variables: WorkflowVariable[],
    rootName: string
): WorkflowVariable | undefined {
    return variables.find((v) => v.name === rootName);
}

/**
 * Resolves a property path from an object
 * @param obj The object to resolve from
 * @param propPath Property path array (e.g., ["address", "city", "name"])
 * @returns Object containing the resolved value and validity flag
 */
export function resolvePropertyPath(
    obj: any,
    propPath: string[]
): { value: any; validPath: boolean; errorMessage?: string } {
    if (propPath.length === 0) {
        return { value: obj, validPath: true };
    }

    let currentValue = obj;
    let validPath = true;
    let errorProp = '';
    let errorReason = '';

    for (const prop of propPath) {
        // Check if currentValue is null or undefined
        if (currentValue === null) {
            validPath = false;
            errorProp = prop;
            errorReason = 'null value';
            break;
        }

        if (currentValue === undefined) {
            validPath = false;
            errorProp = prop;
            errorReason = 'undefined value';
            break;
        }

        // Check if currentValue is an object
        if (typeof currentValue !== 'object') {
            validPath = false;
            errorProp = prop;
            errorReason = `value is of type '${typeof currentValue}', not an object`;
            break;
        }

        // Check if property exists
        if (prop in currentValue) {
            currentValue = currentValue[prop];
        } else {
            validPath = false;
            errorProp = prop;
            errorReason = 'property not found';
            break;
        }
    }

    let errorMessage: string | undefined;
    if (!validPath) {
        errorMessage = `Cannot access property '${errorProp}' in path '${propPath.join('.')}': ${errorReason}`;
    }

    return {
        value: validPath ? currentValue : undefined,
        validPath,
        errorMessage
    };
}

/**
 * Resolves a variable path to its value
 * @param variables Array of variables to search
 * @param variablePath Full path to resolve (e.g., "address.city.name")
 * @returns The resolved value or undefined if path is invalid
 */
export function resolveVariablePath(
    variables: WorkflowVariable[],
    variablePath: string
): { value: any; validPath: boolean; errorMessage?: string } {
    const { rootName, propPath } = parseVariablePath(variablePath);
    const variable = findVariableByRootName(variables, rootName);

    if (!variable) {
        return {
            value: undefined,
            validPath: false,
            errorMessage: `Variable "${rootName}" not found`
        };
    }

    if (!variable.value) {
        return {
            value: undefined,
            validPath: false,
            errorMessage: `Variable "${rootName}" has no value`
        };
    }

    if (propPath.length === 0) {
        return { value: variable.value, validPath: true };
    }

    const result = resolvePropertyPath(variable.value, propPath);

    if (!result.validPath) {
        return {
            ...result,
            errorMessage: `Property path "${propPath.join('.')}" not found in variable "${rootName}"`
        };
    }

    return result;
}

/**
 * Sets a value at a specified property path in an object, creating intermediate objects as needed
 * @param obj The object to set value in
 * @param propPath Property path array (e.g., ["address", "city", "name"])
 * @param value Value to set at the specified path
 * @returns New object with the value set (original object is not modified)
 */
export function setValueAtPath(
    obj: any,
    propPath: string[],
    value: any
): any {
    if (propPath.length === 0) {
        return value;
    }

    // Clone object to avoid mutation
    const newObj = obj && typeof obj === "object"
        ? JSON.parse(JSON.stringify(obj))
        : {};

    let currentObj = newObj;

    for (let i = 0; i < propPath.length; i++) {
        const prop = propPath[i];

        // If we're at the last property in the path, set the value
        if (i === propPath.length - 1) {
            currentObj[prop] = value;
        } else {
            // Create the intermediate object if it doesn't exist
            if (!currentObj[prop] || typeof currentObj[prop] !== "object") {
                currentObj[prop] = {};
            }
            currentObj = currentObj[prop];
        }
    }

    return newObj;
}

/**
 * Validates a property path against a schema
 * @param schema The root schema to validate against
 * @param propPath Property path to validate
 * @returns Object with validity and resulting schema at the path endpoint
 */
export function validatePropertyPathAgainstSchema(
    schema: Schema,
    propPath: string[]
): { valid: boolean; schema: Schema | undefined; errorPath?: string } {
    if (propPath.length === 0) {
        return { valid: true, schema };
    }

    if (schema.type !== "object") {
        return {
            valid: false,
            schema: undefined,
            errorPath: ""
        };
    }

    let currentSchema: Schema | undefined = schema;

    for (let i = 0; i < propPath.length; i++) {
        const prop = propPath[i];
        const currentPath = propPath.slice(0, i + 1).join(".");

        if (currentSchema?.fields && prop in currentSchema.fields) {
            currentSchema = currentSchema.fields[prop];
        } else {
            return {
                valid: false,
                schema: undefined,
                errorPath: currentPath
            };
        }
    }

    return { valid: true, schema: currentSchema };
}

/**
 * Validates and resolves a variable path against both schema and runtime value
 * @param variable The root variable
 * @param propPath Property path to validate and resolve
 * @returns Comprehensive validation and resolution result
 */
export function validateAndResolveVariablePath(
    variable: WorkflowVariable,
    propPath: string[]
): {
    valid: boolean;
    value: any;
    schema: Schema | undefined;
    errorMessage?: string;
} {


    // Short circuit for direct variable access
    if (propPath.length === 0) {
        return {
            valid: true,
            value: variable.value,
            schema: variable.schema
        };
    }

    // If we're trying to access properties but the variable is not an object type,
    // provide a more specific error message
    if (variable.schema.type !== 'object' && !variable.schema.is_array) {
        return {
            valid: false,
            value: undefined,
            schema: undefined,
            errorMessage: `Variable "${variable.name}" is of type "${variable.schema.type}", not an object - cannot access property "${propPath[0]}"`
        };
    }

    // If the value is undefined or null but the schema is valid, we'll still validate against schema
    // This allows for validation during design time when values might not be available

    // Validate against schema
    const schemaValidation = validatePropertyPathAgainstSchema(
        variable.schema,
        propPath
    );

    if (!schemaValidation.valid) {
        return {
            valid: false,
            value: undefined,
            schema: undefined,
            errorMessage: schemaValidation.errorPath
                ? `Schema for "${variable.name}" does not define property "${schemaValidation.errorPath}"`
                : `Variable "${variable.name}" is not an object, cannot access properties`
        };
    }

    // If we have a value, validate against runtime
    if (variable.value !== undefined && variable.value !== null) {
        // Extra check for runtime type mismatch
        if (typeof variable.value !== 'object') {
            return {
                valid: false,
                value: undefined,
                schema: schemaValidation.schema,
                errorMessage: `Variable "${variable.name}" has value of type "${typeof variable.value}" at runtime, expected object to access "${propPath.join('.')}"`
            };
        }

        const { value, validPath, errorMessage } = resolvePropertyPath(variable.value, propPath);

        if (!validPath) {
            return {
                valid: false,
                value: undefined,
                schema: schemaValidation.schema,
                errorMessage: errorMessage || `Property path "${propPath.join('.')}" is invalid for variable "${variable.name}" - runtime value doesn't match schema`
            };
        }

        return {
            valid: true,
            value,
            schema: schemaValidation.schema
        };
    }

    // If we don't have a value but the schema is valid, return a valid result with undefined value
    return {
        valid: true,
        value: undefined,
        schema: schemaValidation.schema
    };
} 