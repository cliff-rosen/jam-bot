import React, { useState, useEffect } from 'react';
import { Tool, ToolParameterName, ToolOutputName } from '../types/tools';
import { Schema, ValueType } from '../types/schema';
import {
    WorkflowVariable,
    WorkflowVariableName,
    EnhancedOutputMapping,
    VariableOperationType,
    isEnhancedMapping,
    getVariableNameFromMapping,
    getOperationFromMapping
} from '@/types/workflows';
import { getTypeColor, isCompatibleType } from '@/lib/utils/variableUIUtils';
import VariablePathButton from './VariablePathButton';

/**
 * DataFlowMapper2 - Maps tool parameters and outputs to workflow variables
 * 
 * This component uses a unified state approach where all workflow variables are available
 * for both parameter and output mappings. While variables have an io_type property ('input' or 'output'),
 * this is primarily metadata about their original purpose. In practice, any variable can be used
 * as input to or receive output from any step, regardless of its io_type.
 * 
 * For example, a variable initially created as an 'input' can later receive output from a step,
 * and a variable created as an 'output' from one step can be used as input to another step.
 */
interface DataFlowMapper2Props {
    // Original DataFlowMapper props
    tool: Tool;
    parameter_mappings: Record<ToolParameterName, WorkflowVariableName>;
    output_mappings: Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>;
    // Use a unified state array instead of separate inputs/outputs
    workflowState: WorkflowVariable[];
    onParameterMappingChange: (mappings: Record<ToolParameterName, WorkflowVariableName>) => void;
    onOutputMappingChange: (mappings: Record<ToolOutputName, WorkflowVariableName | EnhancedOutputMapping>) => void;
    // New prop for variable creation
    onVariableCreate?: (variable: WorkflowVariable) => void;
}

const DataFlowMapper2: React.FC<DataFlowMapper2Props> = ({
    tool,
    parameter_mappings,
    output_mappings,
    workflowState = [],
    onParameterMappingChange,
    onOutputMappingChange,
    onVariableCreate
}) => {

    // Track variable creation modal
    const [showVariableCreation, setShowVariableCreation] = useState(false);
    const [creatingForParameter, setCreatingForParameter] = useState<string | null>(null);
    const [creatingForOutput, setCreatingForOutput] = useState<string | null>(null);

    // Track variable creation form state
    const [newVarName, setNewVarName] = useState('');
    const [newVarDescription, setNewVarDescription] = useState('');
    const [newVarSchema, setNewVarSchema] = useState<Schema | null>(null);
    const [nameError, setNameError] = useState<string | null>(null);

    // Debug log to see what variables are being passed
    console.log('DataFlowMapper2 workflowState:', workflowState);
    console.log('workflowState by io_type:', {
        inputs: workflowState.filter(v => v.io_type === 'input'),
        outputs: workflowState.filter(v => v.io_type === 'output'),
        evaluation: workflowState.filter(v => v.io_type === 'evaluation')
    });

    // Add useEffect to log tool signature structure
    useEffect(() => {

        // if (tool.signature.outputs && tool.signature.outputs.length > 0) {
        //     const firstOutput = tool.signature.outputs[0];
        //     console.log('First output:', firstOutput);
        //     console.log('First output schema:', firstOutput.schema);
        //     console.log('First output schema type:', firstOutput.schema?.type);
        //     console.log('First output schema is_array:', firstOutput.schema?.is_array);
        // }

        // if (tool.signature.parameters && tool.signature.parameters.length > 0) {
        //     const firstParam = tool.signature.parameters[0];
        //     console.log('First parameter:', firstParam);
        //     console.log('First parameter schema:', firstParam.schema);
        //     console.log('First parameter schema type:', firstParam.schema?.type);
        //     console.log('First parameter schema is_array:', firstParam.schema?.is_array);
        // }
    }, [tool]);

    const handleCreateParameterVariable = (paramName: string) => {
        const param = tool.signature.parameters.find(p => p.name === paramName);
        setCreatingForParameter(paramName);

        // The schema structure is nested, so we need to extract it properly
        if (!param || !param.schema) {
            // Fallback to a default schema if param or schema is missing
            setNewVarSchema({
                type: 'string' as ValueType,
                is_array: false,
                description: '',
                fields: {}
            });
        } else {
            // Create a properly structured Schema object from the parameter schema
            // Ensure we're correctly handling the schema structure
            const schema = param.schema;
            const safeSchema: Schema = {
                type: (schema.type as ValueType) || 'string',
                is_array: Boolean(schema.is_array),
                description: schema.description || '',
                fields: schema.fields ? { ...schema.fields } : {},
                format: schema.format,
                content_types: schema.content_types
            };
            setNewVarSchema(safeSchema);
        }

        setNewVarName(paramName);
        setShowVariableCreation(true);
    };

    const handleCreateOutputVariable = (outputName: string) => {
        const output = tool.signature.outputs.find(o => o.name === outputName);
        setCreatingForOutput(outputName);

        // The schema structure is nested, so we need to extract it properly
        if (!output || !output.schema || output.schema.type != 'object') {
            // Fallback to a default schema if output or schema is missing
            setNewVarSchema({
                type: 'string' as ValueType,
                is_array: false,
                description: '',
                fields: {}
            });
        } else {
            const fields = output.schema.fields || {};
            console.log('fields', fields);

            var newFields: Record<string, Schema> = {};

            // iterate over the fields and create a new schema for each field       
            Object.entries(fields).forEach(([fieldName, fieldSchema]) => {
                newFields[fieldName] = fieldSchema as Schema;
            });

            const newSchema = {
                type: 'object' as ValueType,
                is_array: output.schema.is_array,
                description: output.schema.description,
                fields: newFields
            };

            console.log('newSchema', newSchema);
            setNewVarSchema(newSchema);
        }

        setNewVarName(outputName);
        setShowVariableCreation(true);
    };

    const handleParameterMappingChange = (paramName: string, selectedWorkflowVariablePath: string) => {
        const newMappings = {
            ...parameter_mappings,
            [paramName as ToolParameterName]: selectedWorkflowVariablePath as WorkflowVariableName
        };
        onParameterMappingChange(newMappings);
    };

    const handleOutputMappingChange = (outputName: string, selectedWorkflowVariablePath: string) => {
        const currentMapping = output_mappings[outputName as ToolOutputName];
        let newMapping: WorkflowVariableName | EnhancedOutputMapping;

        // Preserve the operation if it's an enhanced mapping
        if (isEnhancedMapping(currentMapping)) {
            newMapping = {
                variable: selectedWorkflowVariablePath as WorkflowVariableName,
                operation: currentMapping.operation
            };
        } else {
            newMapping = selectedWorkflowVariablePath as WorkflowVariableName;
        }

        const newMappings = {
            ...output_mappings,
            [outputName as ToolOutputName]: newMapping
        };

        onOutputMappingChange(newMappings);
    };

    const handleOutputOperationChange = (outputName: string, operation: VariableOperationType) => {
        const currentMapping = output_mappings[outputName as ToolOutputName];
        let newMapping: EnhancedOutputMapping;

        // Get the variable name from the current mapping
        const variableName = getVariableNameFromMapping(currentMapping);

        // Create an enhanced mapping with the new operation
        newMapping = {
            variable: variableName,
            operation: operation
        };

        const newMappings = {
            ...output_mappings,
            [outputName as ToolOutputName]: newMapping
        };

        onOutputMappingChange(newMappings);
    };

    // This method uses the following state as input:
    // - creatingForParameter
    // - creatingForOutput
    // - newVarName
    // - newVarSchema
    // It essentially creates a new var named newVarName with the schema newVarSchema
    // and adds it to the workflowState
    // It then updates the mapping for the parameter or output that is currently being created
    const handleCreateVariableSubmit = () => {
        const paramOrOutput = creatingForParameter
            ? tool.signature.parameters?.find(p => p.name === creatingForParameter)
            : creatingForOutput
                ? tool.signature.outputs?.find(o => o.name === creatingForOutput)
                : null;

        if (!paramOrOutput || !newVarName || !onVariableCreate) {
            return;
        }

        // Validate schema
        const validatedSchema = validateSchema(newVarSchema);

        // Create the new variable
        const newVar: WorkflowVariable = {
            variable_id: `var_${Date.now()}`,
            name: newVarName as WorkflowVariableName,
            schema: validatedSchema,
            io_type: creatingForParameter ? 'input' : 'output',
            required: creatingForParameter ? true : false
        };

        console.log('Created new variable:', newVar);
        onVariableCreate(newVar);

        // Update the mapping
        if (creatingForParameter) {
            handleParameterMappingChange(creatingForParameter, newVarName);
        } else {
            handleOutputMappingChange(creatingForOutput, newVarName);
        }

        // Close the modal
        setShowVariableCreation(false);
        setCreatingForParameter(null);
        setCreatingForOutput(null);
        setNewVarName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && newVarName.trim() && newVarSchema) {
            e.preventDefault();
            handleCreateVariableSubmit();
        }
    };

    const renderSchemaEditor = () => {
        if (!newVarSchema) return null;

        // If we're creating for a specific parameter/output, show schema info instead of editor
        if (creatingForParameter || creatingForOutput) {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Schema (inherited from {creatingForParameter ? 'parameter' : 'output'})
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                            <span className={`text-sm ${getTypeColor(newVarSchema.type || 'string', Boolean(newVarSchema.is_array))}`}>
                                {newVarSchema.type || 'string'}{newVarSchema.is_array ? '[]' : ''}
                            </span>
                        </div>
                        {newVarSchema.type === 'object' && newVarSchema.fields && (
                            <div className="mt-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Fields:</div>
                                <div className="space-y-2 pl-4">
                                    {Object.entries(newVarSchema.fields || {}).map(([fieldName, fieldSchema]) => {
                                        // Add null check for fieldSchema
                                        if (!fieldSchema) return null;

                                        // Ensure we have a type
                                        const fieldType = fieldSchema.type || 'string';
                                        const isArray = Boolean(fieldSchema.is_array);

                                        return (
                                            <div key={fieldName} className="flex items-center justify-between border-l-2 border-gray-200 dark:border-gray-700 pl-2 py-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    <span className="font-bold">{fieldName}</span>
                                                    {fieldSchema.description && (
                                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                                            ({fieldSchema.description})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={`text-sm ${getTypeColor(fieldType, isArray)}`}>
                                                    {fieldType}{isArray ? '[]' : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Helper functions for schema editing
        const addObjectField = () => {
            const fields = newVarSchema.fields || {};
            setNewVarSchema({
                ...newVarSchema,
                fields: {
                    ...fields,
                    [`field_${Object.keys(fields).length + 1}`]: {
                        type: 'string' as ValueType,
                        description: '',
                        is_array: false,
                        fields: {}
                    }
                }
            });
        };

        const updateObjectField = (fieldName: string, updates: Partial<Schema>) => {
            if (!newVarSchema.fields) return;

            // Ensure the field exists
            const currentField = newVarSchema.fields[fieldName] || {
                type: 'string' as ValueType,
                description: '',
                is_array: false,
                fields: {}
            };

            // Create a properly structured updated field
            const updatedField: Schema = {
                ...currentField,
                ...updates,
                // Ensure fields is properly initialized if type is changing to object
                fields: updates.type === 'object' ?
                    (updates.fields || currentField.fields || {}) :
                    (currentField.type === 'object' ? currentField.fields : {})
            };

            setNewVarSchema({
                ...newVarSchema,
                fields: {
                    ...newVarSchema.fields,
                    [fieldName]: updatedField
                }
            });
        };

        const removeObjectField = (fieldName: string) => {
            if (!newVarSchema.fields) return;

            const { [fieldName]: removed, ...remainingFields } = newVarSchema.fields;
            setNewVarSchema({
                ...newVarSchema,
                fields: remainingFields
            });
        };

        // Original schema editor for when we're not creating for a specific parameter/output
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schema
                </label>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                        <select
                            value={newVarSchema.type}
                            onChange={(e) => setNewVarSchema({
                                ...newVarSchema,
                                type: e.target.value as any,
                                fields: e.target.value === 'object' ? {} : undefined
                            })}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="object">Object</option>
                            <option value="array">Array</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isArray"
                            checked={newVarSchema.is_array || false}
                            onChange={(e) => setNewVarSchema({
                                ...newVarSchema,
                                is_array: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isArray" className="text-sm text-gray-600 dark:text-gray-400">
                            Is Array
                        </label>
                    </div>

                    {newVarSchema.type === 'object' && (
                        <div className="mt-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm text-gray-600 dark:text-gray-400">
                                    Object Fields
                                </label>
                                <button
                                    onClick={addObjectField}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                                >
                                    + Add Field
                                </button>
                            </div>
                            <div className="space-y-3">
                                {Object.entries(newVarSchema.fields || {}).map(([fieldName, fieldSchema]) => (
                                    <div key={fieldName} className="flex items-start space-x-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={fieldName}
                                                onChange={(e) => {
                                                    const newFields = { ...newVarSchema.fields };
                                                    delete newFields[fieldName];
                                                    setNewVarSchema({
                                                        ...newVarSchema,
                                                        fields: {
                                                            ...newFields,
                                                            [e.target.value]: fieldSchema
                                                        }
                                                    });
                                                }}
                                                placeholder="Field name"
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                            <select
                                                value={fieldSchema.type}
                                                onChange={(e) => updateObjectField(fieldName, { type: e.target.value as any })}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            >
                                                <option value="string">String</option>
                                                <option value="number">Number</option>
                                                <option value="boolean">Boolean</option>
                                                <option value="object">Object</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={fieldSchema.description || ''}
                                                onChange={(e) => updateObjectField(fieldName, { description: e.target.value })}
                                                placeholder="Field description"
                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 
                                                         rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeObjectField(fieldName)}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderParameterMappings = () => {
        if (!tool.signature.parameters || tool.signature.parameters.length === 0) {
            return (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    This tool has no input parameters.
                </div>
            );
        }

        return (
            <div className="space-y-1.5">
                {tool.signature.parameters.map(param => (
                    <div key={param.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-1.5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                                <span className={`text-xs font-medium ${getTypeColor(param.schema?.type || 'string', Boolean(param.schema?.is_array))}`}>
                                    {param.name}
                                    {param.schema?.is_array && '[]'}
                                </span>
                                {param.required && (
                                    <span className="text-xs text-red-500">*</span>
                                )}
                            </div>
                            <button
                                onClick={() => handleCreateParameterVariable(param.name)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                + Create Variable
                            </button>
                        </div>

                        <VariablePathButton
                            variables={workflowState || []}
                            selectedWorkflowVariablePath={parameter_mappings[param.name as ToolParameterName] || ''}
                            onChange={(selectedWorkflowVariablePath) => handleParameterMappingChange(param.name, selectedWorkflowVariablePath)}
                            targetSchema={param.schema}
                            placeholder="Select variable or property..."
                            className="text-xs py-1"
                            modalTitle={`Select for parameter: ${param.name}`}
                        />
                    </div>
                ))}
            </div>
        );
    };

    const renderOutputMappings = () => {
        if (!tool.signature.outputs || tool.signature.outputs.length === 0) {
            return (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    This tool has no outputs.
                </div>
            );
        }

        return (
            <div className="space-y-1.5">
                {tool.signature.outputs.map(output => {
                    const currentMapping = output_mappings[output.name as ToolOutputName];
                    const variableName = getVariableNameFromMapping(currentMapping);
                    const operation = getOperationFromMapping(currentMapping);

                    // Check if the output schema is an array or string (supports append)
                    const supportsAppend = output.schema?.is_array || output.schema?.type === 'string';

                    return (
                        <div key={output.name} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-1.5">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                    <span className={`text-xs font-medium ${getTypeColor(output.schema?.type || 'string', Boolean(output.schema?.is_array))}`}>
                                        {output.name}
                                        {output.schema?.is_array && '[]'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleCreateOutputVariable(output.name)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    + Create Variable
                                </button>
                            </div>

                            <div className="flex gap-2 items-center">
                                <div className="flex-grow">
                                    <VariablePathButton
                                        variables={workflowState || []}
                                        selectedWorkflowVariablePath={variableName || ''}
                                        onChange={(selectedWorkflowVariablePath) => handleOutputMappingChange(output.name, selectedWorkflowVariablePath)}
                                        placeholder="Select variable..."
                                        className="text-xs py-1"
                                        targetSchema={output.schema}
                                        modalTitle={`Select for output: ${output.name}`}
                                    />
                                </div>

                                {supportsAppend && (
                                    <div className="flex-shrink-0">
                                        <select
                                            value={operation}
                                            onChange={(e) => handleOutputOperationChange(output.name, e.target.value as VariableOperationType)}
                                            className="text-xs border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 bg-white dark:bg-gray-700"
                                        >
                                            <option value={VariableOperationType.ASSIGN}>Assign</option>
                                            <option value={VariableOperationType.APPEND}>Append</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Helper function to validate schema
    const validateSchema = (schema: Schema): Schema => {
        return {
            type: schema.type || 'string',
            is_array: Boolean(schema.is_array),
            description: schema.description || '',
            fields: schema.fields ? { ...schema.fields } : {},
            format: schema.format,
            content_types: schema.content_types
        };
    };

    return (
        <div className="space-y-3 relative min-h-[200px]">
            {/* Variable Creation Modal */}
            {showVariableCreation && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                                Create New Variable
                            </h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Variable Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newVarName}
                                        onChange={(e) => {
                                            setNewVarName(e.target.value);
                                            setNameError(null); // Clear error when user types
                                        }}
                                        className={`w-full px-3 py-2 text-sm border ${nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            } rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100`}
                                        placeholder="Enter variable name"
                                        autoFocus
                                    />
                                    {nameError && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {nameError}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={newVarDescription}
                                        onChange={(e) => setNewVarDescription(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        rows={2}
                                        placeholder="Describe the purpose of this variable"
                                    />
                                </div>

                                {renderSchemaEditor()}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                            <button
                                onClick={() => {
                                    setShowVariableCreation(false);
                                    setCreatingForParameter(null);
                                    setCreatingForOutput(null);
                                    setNewVarSchema(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateVariableSubmit}
                                disabled={!newVarName.trim() || !newVarSchema}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                                         hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                Create Variable
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compact Parameter Mappings */}
            <div className="relative mb-6">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Input Parameters
                </h4>
                {renderParameterMappings()}
            </div>

            {/* Compact Output Mappings */}
            <div className="relative mb-6">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Output Mappings
                </h4>
                {renderOutputMappings()}
            </div>
        </div>
    );
};

export default DataFlowMapper2; 