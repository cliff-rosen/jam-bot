import { WorkflowVariable } from '../../types/workflows';
import { Schema } from '../../types/schema';
import { parseVariablePath } from './variablePathUtils';



/**
 * Get color for data type (UI helper)
 */
export const getTypeColor = (type: string, isArray: boolean = false): string => {
    if (isArray) return 'text-orange-600 dark:text-orange-400';
    switch (type) {
        case 'string': return 'text-blue-600 dark:text-blue-400';
        case 'number': return 'text-green-600 dark:text-green-400';
        case 'boolean': return 'text-purple-600 dark:text-purple-400';
        case 'object': return 'text-red-600 dark:text-red-400';
        default: return 'text-gray-600 dark:text-gray-400';
    }
};

/**
 * Format a variable path for display
 */
export const formatVariablePath = (variablePath: string): string => {
    if (!variablePath) return 'Select or create variable';

    const { rootName, propPath } = parseVariablePath(variablePath);
    if (propPath.length === 0) {
        return rootName;
    }

    // Use a more visually distinct separator for nested paths
    return `${rootName}.${propPath.join('.')}`;
};

/**
 * Render variable paths with properties for selection
 * @param variable The workflow variable to render
 * @param onClick Callback when a path is clicked, receives the full path string
 * @param depth Current depth (for recursion)
 * @param currentPath Current path segments (for recursion)
 * @returns Array of JSX elements for rendering
 */
export const renderVariablePaths = (
    variable: WorkflowVariable,
    onClick: (path: string) => void,
    depth = 0,
    currentPath: string[] = []
): JSX.Element[] => {
    const { schema } = variable;

    // For non-object types or objects without fields, return the base variable button
    if (schema.type !== 'object' || !schema.fields) {
        return [
            <button
                key={variable.name + '_' + currentPath.join('.')}
                onClick={() => {
                    const fullPath = currentPath.length > 0
                        ? `${variable.name}.${currentPath.join('.')}`
                        : variable.name;
                    onClick(fullPath);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                        ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}`}
            >
                <span>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : variable.name}</span>
                <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                    {schema.type}{schema.is_array ? '[]' : ''}
                </span>
            </button>
        ];
    }

    // For objects, first add a button for the whole object (only at the root level)
    const baseButton = currentPath.length === 0 ? [
        <button
            key={variable.name}
            onClick={() => {
                onClick(variable.name);
            }}
            className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                    hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                    ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}`}
        >
            <span>{variable.name} (whole object)</span>
            <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                {schema.type}{schema.is_array ? '[]' : ''}
            </span>
        </button>
    ] : [];

    // Then add buttons for each field of the object
    const fieldButtons = Object.entries(schema.fields).flatMap(([fieldName, fieldSchema]) => {
        const newPath = [...currentPath, fieldName];
        const newDepth = depth + 1;

        // Create the button for this field
        const fieldButton = (
            <button
                key={variable.name + '_' + newPath.join('.')}
                onClick={() => {
                    const fullPath = `${variable.name}.${newPath.join('.')}`;
                    onClick(fullPath);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                        pl-${newDepth * 4 + 3} border-l border-gray-200 dark:border-gray-700`}
            >
                <span>{fieldName}</span>
                <span className={`text-xs ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                    {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                </span>
            </button>
        );

        // If this field is an object with fields, recursively get its properties
        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            // Create a temporary variable with this field's schema
            const tempVar: WorkflowVariable = {
                ...variable,
                schema: fieldSchema
            } as WorkflowVariable;

            // Return this field's button plus all its nested properties
            return [
                fieldButton,
                ...renderVariablePaths(tempVar, onClick, newDepth, newPath)
            ];
        }

        // For non-object fields, just return the field button
        return [fieldButton];
    });

    return [...baseButton, ...fieldButtons];
};

/**
 * Simple type compatibility check between schemas
 */
export const isCompatibleType = (paramSchema: Schema | null, varSchema: Schema | null): boolean => {
    // Handle null schemas - if either is null, we can't determine compatibility
    if (!paramSchema || !varSchema) {
        return true; // Default to allowing compatibility when schema info is missing
    }

    // Direct type match
    if (paramSchema.type === varSchema.type && paramSchema.is_array === varSchema.is_array) {
        return true;
    }

    // Special case for any array to its item type conversion
    // This allows selecting an array when a single item is expected
    // The runtime will handle extracting the first item or similar logic
    if (!paramSchema.is_array && varSchema.is_array && paramSchema.type === varSchema.type) {
        return true;
    }

    // Object property compatibility - if param is a primitive type, it can match a property of an object
    // BUT we don't allow direct object-to-string mappings (only object properties to string)
    if (!paramSchema.is_array && varSchema.type === 'object' && varSchema.fields) {
        // If the parameter is a string and the variable is an object, we don't allow direct mapping
        // We only allow mapping specific properties of the object to the string
        if (['string', 'number', 'boolean'].includes(paramSchema.type)) {
            // Check if any field in the object is compatible with the parameter
            return Object.values(varSchema.fields).some(fieldSchema => {
                // Skip null fields
                if (!fieldSchema) return false;
                return isCompatibleType(paramSchema, fieldSchema);
            });
        }
        return false;
    }

    // Prevent string outputs from being mapped to object variables
    // This is the reverse of the above case - if the parameter is an object and the variable is a primitive type
    if (paramSchema.type === 'object' &&
        ['string', 'number', 'boolean'].includes(varSchema.type)) {
        return false;
    }

    // Check object fields compatibility for object-to-object mapping
    if (paramSchema.type === 'object' && varSchema.type === 'object' &&
        paramSchema.fields && varSchema.fields) {

        // If the parameter object has no fields, any object is compatible
        if (Object.keys(paramSchema.fields).length === 0) {
            return true;
        }

        // Check if all required fields in the parameter schema exist and are compatible in the variable schema
        return Object.entries(paramSchema.fields).every(([fieldName, fieldSchema]) => {
            const varFields = varSchema.fields || {};
            const varField = varFields[fieldName];
            // Skip null fields or schemas
            if (!fieldSchema || !varField) return false;
            return varField && isCompatibleType(fieldSchema, varField);
        });
    }

    return false;
};

/**
 * Enhanced version of renderVariablePaths that includes property paths for compatible types
 * This allows selecting individual properties of object variables for mapping to primitive parameters
 * @param variable The workflow variable to render
 * @param targetSchema Optional target schema to filter compatible paths
 * @param onClick Callback when a path is clicked, receives the full path string
 * @param depth Current depth (for recursion)
 * @param currentPath Current path segments (for recursion)
 * @returns Array of JSX elements for rendering
 */
export const renderVariablePathsWithProperties = (
    variable: WorkflowVariable,
    targetSchema: Schema | null,
    onClick: (path: string) => void,
    depth = 0,
    currentPath: string[] = []
): JSX.Element[] => {
    const { schema } = variable;

    // For non-object types or objects without fields, return the base variable button
    if (schema.type !== 'object' || !schema.fields) {
        // If we have a target schema, check compatibility
        if (targetSchema && !isCompatibleType(targetSchema, schema)) {
            return [];
        }

        // Check if this is directly compatible with the target schema
        const isDirectMatch = targetSchema &&
            targetSchema.type === schema.type &&
            targetSchema.is_array === schema.is_array;

        return [
            <button
                key={variable.name + '_' + currentPath.join('.')}
                onClick={() => {
                    const fullPath = currentPath.length > 0
                        ? `${variable.name}.${currentPath.join('.')}`
                        : variable.name;
                    onClick(fullPath);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                        ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}
                        ${targetSchema && isDirectMatch ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
            >
                <div className="flex items-center">
                    <span>{currentPath.length > 0 ? currentPath[currentPath.length - 1] : variable.name}</span>
                    {currentPath.length === 0 && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${variable.io_type === 'input'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : variable.io_type === 'output'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            }`}>
                            {variable.io_type}
                        </span>
                    )}
                    {targetSchema && isDirectMatch && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            (perfect match)
                        </span>
                    )}
                </div>
                <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                    {schema.type}{schema.is_array ? '[]' : ''}
                </span>
            </button>
        ];
    }

    // For objects, first add a button for the whole object (only at the root level)
    const baseButton = currentPath.length === 0 ? [
        <button
            key={variable.name}
            onClick={() => {
                onClick(variable.name);
            }}
            className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                    hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                    ${depth > 0 ? 'pl-' + (depth * 4 + 3) + ' border-l border-gray-200 dark:border-gray-700' : ''}
                    ${targetSchema && targetSchema.type === 'object' ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
        >
            <div className="flex items-center">
                <span>{variable.name} (whole object)</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${variable.io_type === 'input'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    : variable.io_type === 'output'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                    }`}>
                    {variable.io_type}
                </span>
                {targetSchema && targetSchema.type === 'object' && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        (compatible)
                    </span>
                )}
            </div>
            <span className={`text-xs ${getTypeColor(schema.type, schema.is_array)}`}>
                {schema.type}{schema.is_array ? '[]' : ''}
            </span>
        </button>
    ] : [];

    // If we have a target schema and the whole object isn't compatible, don't show the base button
    // Also explicitly hide the whole object option when the target schema is a primitive type
    // And hide primitive variables when the target schema is an object
    if (targetSchema && currentPath.length === 0 &&
        (!isCompatibleType(targetSchema, schema) ||
            // Hide object variables when target is a primitive type
            (schema.type === 'object' &&
                ['string', 'number', 'boolean'].includes(targetSchema.type)) ||
            // Hide primitive variables when target is an object
            (['string', 'number', 'boolean'].includes(schema.type) &&
                targetSchema.type === 'object'))) {
        baseButton.length = 0;
    }

    // Then add buttons for each field of the object
    const fieldButtons = Object.entries(schema.fields).flatMap(([fieldName, fieldSchema]) => {
        const newPath = [...currentPath, fieldName];
        const newDepth = depth + 1;

        // If we have a target schema, check compatibility for this field
        if (targetSchema) {
            // For primitive fields, check direct compatibility
            if (fieldSchema.type !== 'object') {
                if (!isCompatibleType(targetSchema, fieldSchema)) {
                    return [];
                }
            } else if (fieldSchema.type === 'object' && fieldSchema.fields) {
                // For object fields, check if any of its properties are compatible
                // or if the object itself is compatible
                const hasCompatibleProperties = Object.values(fieldSchema.fields).some(subFieldSchema =>
                    isCompatibleType(targetSchema, subFieldSchema)
                );

                if (!hasCompatibleProperties && !isCompatibleType(targetSchema, fieldSchema)) {
                    return [];
                }
            }
        }

        // Check if this field is directly compatible with the target schema
        const isDirectMatch = targetSchema &&
            targetSchema.type === fieldSchema.type &&
            targetSchema.is_array === fieldSchema.is_array;

        // Create the button for this field
        const fieldButton = (
            <button
                key={variable.name + '_' + newPath.join('.')}
                onClick={() => {
                    const fullPath = `${variable.name}.${newPath.join('.')}`;
                    onClick(fullPath);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100
                        hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between
                        pl-${newDepth * 4 + 3} border-l border-gray-200 dark:border-gray-700
                        ${targetSchema && isDirectMatch ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
            >
                <div className="flex items-center">
                    <span>{fieldName}</span>
                    {targetSchema && isDirectMatch && (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            (perfect match)
                        </span>
                    )}
                </div>
                <span className={`text-xs ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                    {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                </span>
            </button>
        );

        // If this field is an object with fields, recursively get its properties
        if (fieldSchema.type === 'object' && fieldSchema.fields) {
            // Create a temporary variable with this field's schema
            const tempVar: WorkflowVariable = {
                ...variable,
                schema: fieldSchema
            } as WorkflowVariable;

            // Return this field's button plus all its nested properties
            return [
                fieldButton,
                ...renderVariablePathsWithProperties(tempVar, targetSchema, onClick, newDepth, newPath)
            ];
        }

        // For non-object fields, just return the field button
        return [fieldButton];
    });

    return [...baseButton, ...fieldButtons];
}; 