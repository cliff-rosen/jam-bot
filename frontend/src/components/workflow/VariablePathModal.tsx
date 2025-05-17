import React, { useState, useEffect } from 'react';
import { WorkflowVariable, WorkflowVariableName } from '@/types/workflows';
import { Schema } from '@/types/schema';
import { getTypeColor, isCompatibleType } from '@/lib/utils/variableUIUtils';

interface VariablePathModalProps {
    isOpen: boolean;
    onClose: () => void;
    variables: WorkflowVariable[];
    selectedWorkflowVariablePath: string;
    onChange: (selectedWorkflowVariablePath: string) => void;
    targetSchema?: Schema | null;
    title?: string;
}

const VariablePathModal: React.FC<VariablePathModalProps> = ({
    isOpen,
    onClose,
    variables = [],
    selectedWorkflowVariablePath,
    onChange,
    targetSchema = null,
    title = 'Select Variable'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredVariables, setFilteredVariables] = useState<WorkflowVariable[]>(variables);

    // Reset search and filtered variables when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setFilteredVariables(variables);
        }
    }, [isOpen, variables]);

    // Filter variables when search term changes
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredVariables(variables);
            return;
        }

        const filtered = variables.filter(variable =>
            variable.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredVariables(filtered);
    }, [searchTerm, variables]);

    // Auto-scroll to the selected variable when the modal opens
    useEffect(() => {
        if (isOpen && selectedWorkflowVariablePath) {
            // Use setTimeout to ensure the DOM is fully rendered
            setTimeout(() => {
                const selectedElement = document.querySelector('[data-selected="true"]');
                if (selectedElement) {
                    selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [isOpen, selectedWorkflowVariablePath]);

    const handleVariableSelect = (path: string) => {
        onChange(path);
        onClose();
    };

    // Check if a variable is compatible with the target schema
    const isVariableCompatible = (variable: WorkflowVariable): boolean => {
        if (!targetSchema) return true;
        return isCompatibleType(targetSchema, variable.schema);
    };

    // Check if an object variable has compatible properties for the target schema
    const hasCompatibleProperties = (schema: Schema): boolean => {
        if (schema.type !== 'object' || !schema.fields) return false;

        if (!targetSchema) return true;

        // For primitive target schemas, check if the object has any compatible properties
        if (targetSchema.type && ['string', 'number', 'boolean'].includes(targetSchema.type)) {
            return Object.values(schema.fields).some(
                fieldSchema => fieldSchema.type === targetSchema.type
            );
        }

        // For object target schema, check if the object itself is compatible
        if (targetSchema.type === 'object') {
            return isCompatibleType(targetSchema, schema);
        }

        return false;
    };

    // Helper function to check if a path is currently selected
    const isPathSelected = (path: string): boolean => {
        return selectedWorkflowVariablePath === path;
    };

    // Recursively render object properties
    const renderObjectProperties = (
        variableName: string,
        schema: Schema,
        path: string[] = [],
        level: number = 0
    ) => {
        if (!schema.fields) return null;

        return (
            <div className={`${level > 0 ? 'ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2' : ''}`}>
                {Object.entries(schema.fields).map(([fieldName, fieldSchema]) => {
                    const currentPath = [...path, fieldName];
                    const fullPath = `${variableName}.${currentPath.join('.')}`;
                    const isSelected = isPathSelected(fullPath);

                    // Check if this field is compatible with the target schema
                    const isFieldCompatible = targetSchema ? isCompatibleType(targetSchema, fieldSchema) : true;
                    const fieldDisabled = !isFieldCompatible;

                    // For object fields, check if they have compatible properties
                    const isObject = fieldSchema.type === 'object' && fieldSchema.fields;
                    const hasCompatibleProps = isObject && hasCompatibleProperties(fieldSchema);

                    // Disable object fields that don't have compatible properties
                    const isObjectDisabled = isObject && targetSchema && targetSchema.type &&
                        ['string', 'number', 'boolean'].includes(targetSchema.type) &&
                        !hasCompatibleProps;

                    const isDisabled = fieldDisabled || isObjectDisabled;

                    return (
                        <div key={fullPath} className="mt-1">
                            <div
                                className={`flex items-center justify-between p-2 rounded-md ${isSelected
                                    ? 'bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600'
                                    : isDisabled
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                onClick={() => {
                                    if (!isDisabled) {
                                        handleVariableSelect(fullPath);
                                    }
                                }}
                                data-selected={isSelected ? 'true' : 'false'}
                                data-path={fullPath}
                            >
                                <div className="flex items-center">
                                    <span>{fieldName}</span>
                                    {isSelected && (
                                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                                            (selected)
                                        </span>
                                    )}
                                    {isDisabled && (
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                            (disabled)
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs ${getTypeColor(fieldSchema.type, fieldSchema.is_array)}`}>
                                    {fieldSchema.type}{fieldSchema.is_array ? '[]' : ''}
                                </span>
                            </div>

                            {/* Recursively render nested object properties */}
                            {isObject && !isObjectDisabled && renderObjectProperties(
                                variableName,
                                fieldSchema,
                                currentPath,
                                level + 1
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render a variable with its properties
    const renderVariable = (variable: WorkflowVariable) => {
        const isObject = variable.schema.type === 'object' && variable.schema.fields;
        const isCompatible = isVariableCompatible(variable);
        const hasCompatibleProps = isObject && hasCompatibleProperties(variable.schema);
        const isSelected = isPathSelected(variable.name);

        // For objects that need to map to primitives, disable the parent if it has no compatible properties
        const isDisabled = isObject && targetSchema &&
            ['string', 'number', 'boolean'].includes(targetSchema.type) &&
            !hasCompatibleProps;

        return (
            <div key={variable.name} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                {/* Variable header */}
                <div
                    className={`flex items-center justify-between p-2 ${isSelected
                        ? 'bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600'
                        : isDisabled
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : isCompatible
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/40'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                    onClick={() => {
                        if (!isDisabled && isCompatible) {
                            handleVariableSelect(variable.name);
                        }
                    }}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-path={variable.name}
                >
                    <div className="flex items-center">
                        <span className="font-medium">{variable.name}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${variable.io_type === 'input'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : variable.io_type === 'output'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            }`}>
                            {variable.io_type}
                        </span>
                        {isSelected && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                                (selected)
                            </span>
                        )}
                        {isDisabled && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                (disabled)
                            </span>
                        )}
                    </div>
                    <span className={`text-xs ${getTypeColor(variable.schema.type, variable.schema.is_array)}`}>
                        {variable.schema.type}{variable.schema.is_array ? '[]' : ''}
                    </span>
                </div>

                {/* Object properties */}
                {isObject && variable.schema.fields && !isDisabled && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/50">
                        {renderObjectProperties(variable.name, variable.schema)}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-[65px] bg-white dark:bg-gray-800 z-10">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search variables..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        autoFocus
                    />
                </div>

                {/* Variable list */}
                <div className="p-4 overflow-y-auto flex-1">
                    {filteredVariables.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No variables found
                        </div>
                    ) : (
                        filteredVariables.map(variable => renderVariable(variable))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariablePathModal; 