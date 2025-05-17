// Rename from ActionStepContent.tsx
// This is for executing action steps in run mode 

import React, { useState, useMemo } from 'react';
import { useWorkflows } from '@/context/WorkflowContext';
import { usePromptTemplates } from '@/context/PromptTemplateContext';
import { fileApi } from '@/lib/api/fileApi';
import { WorkflowStep, WorkflowVariableName } from '@/types/workflows';
import { isFileValue } from '@/types/schema';
import Dialog from '@/components/common/Dialog';
import FileLibrary from '@/components/FileLibrary';
import VariableRenderer from '@/components/common/VariableRenderer';
import JsonEditor from '@/components/common/JsonEditor';
import { WorkflowEngine } from '@/lib/workflow/workflowEngine';
import { Link } from 'react-router-dom';
import TemplateEditorDialog from '@/components/workflow/TemplateEditorDialog';

interface ActionStepRunnerProps {
    actionStep: WorkflowStep;
    isExecuted: boolean;
    isExecuting: boolean;
}

interface ValueObject {
    value: any;
    schema: any;
}

// Constants for text truncation
const MAX_TEXT_LENGTH = 200;  // Characters for text
const MAX_ARRAY_LENGTH = 3;   // Items for arrays
const MAX_ARRAY_ITEM_LENGTH = 100;  // Characters per array item

const ActionStepRunner: React.FC<ActionStepRunnerProps> = ({
    actionStep,
    isExecuted,
    isExecuting
}) => {
    console.log('ActionStepRunner received props:', {
        step_id: actionStep.step_id,
        tool: actionStep.tool,
        parameter_mappings: actionStep.parameter_mappings,
        isExecuted,
        isExecuting
    });

    const { workflow, updateWorkflowByAction } = useWorkflows();
    const { templates } = usePromptTemplates();
    const [editingInput, setEditingInput] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<any>(null);
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedParam, setSelectedParam] = useState<{ paramName: string, varName: string } | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string[]>>({});
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>({});

    // Compute input and output values using WorkflowEngine methods
    const inputValues = useMemo(() =>
        WorkflowEngine.getStepInputValuesForUI(actionStep, workflow),
        [workflow, actionStep]);

    const outputValues = useMemo(() =>
        WorkflowEngine.getStepOutputValuesForUI(actionStep, workflow),
        [workflow, actionStep]);

    // Load file names for file values
    React.useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const [paramName, varName] of Object.entries(actionStep.parameter_mappings || {})) {
                const variable = workflow?.state?.find(v => v.name === varName);
                if (variable?.schema.type === 'file' && variable.value && isFileValue(variable.schema, variable.value)) {
                    try {
                        const fileInfo = await fileApi.getFile(variable.value.file_id);
                        newFileNames[variable.value.file_id] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames as unknown as Record<string, string[]>);
        };
        loadFileNames();
    }, [workflow, actionStep]);

    // Get the current prompt template if this is an LLM tool
    const currentTemplate = React.useMemo(() => {
        if (actionStep.tool?.tool_type === 'llm' && actionStep.prompt_template_id) {
            return templates.find(t => t.template_id === actionStep.prompt_template_id);
        }
        return null;
    }, [actionStep.tool, actionStep.prompt_template_id, templates]);

    const handleStartEdit = (paramName: string, value: any) => {
        setEditingInput(paramName);

        // For complex objects and arrays, we'll keep the original value
        // The JsonEditor component will handle the string conversion
        if (typeof value === 'object' && value !== null) {
            setEditValue(value);
        } else {
            setEditValue(value === null || value === undefined ? '' : String(value));
        }
    };

    const handleSaveEdit = (paramName: string, varName: WorkflowVariableName) => {
        if (!workflow) return;

        // Update the variable value in the workflow state
        const updatedState = workflow.state?.map(v => {
            if (v.name === varName) {
                return {
                    ...v,
                    value: editValue
                };
            }
            return v;
        }) || [];

        // Update the workflow state
        updateWorkflowByAction({
            type: 'UPDATE_STATE',
            payload: {
                state: updatedState
            }
        });

        setEditingInput(null);
        setEditValue(null);
    };

    const handleCancelEdit = () => {
        setEditingInput(null);
        setEditValue(null);
    };

    const toggleExpand = (id: string) => {
        setExpandedValues(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (!actionStep.tool) {
        return <div className="text-gray-500 dark:text-gray-400">No tool selected</div>;
    }

    // Special handling for file values
    const renderFileValue = (valueObj: ValueObject | undefined) => {
        if (!valueObj || !valueObj.value || !valueObj.schema || valueObj.schema.type !== 'file') {
            return <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>;
        }

        const fileId = valueObj.value.file_id;
        const fileName = fileNames[fileId] || 'Loading...';

        return (
            <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{fileName}</span>
                    </div>
                    <div className="flex gap-2">
                        {fileId && (
                            <button
                                onClick={async () => {
                                    try {
                                        const content = await fileApi.getFileContent(fileId);
                                        // Open in a new window/tab
                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(`
                                                <html>
                                                    <head>
                                                        <title>${fileName} - Content</title>
                                                        <style>
                                                            body { 
                                                                font-family: monospace;
                                                                padding: 20px;
                                                                white-space: pre-wrap;
                                                                word-wrap: break-word;
                                                            }
                                                        </style>
                                                    </head>
                                                    <body>${content.content}</body>
                                                </html>
                                            `);
                                        }
                                    } catch (err) {
                                        console.error('Error fetching file content:', err);
                                    }
                                }}
                                className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                         dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                         dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                            >
                                View Content
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderEditableValue = (paramName: string, varName: string, valueObj: ValueObject | undefined) => {
        if (editingInput === paramName) {
            // For complex objects and arrays, use the JsonEditor
            if (typeof editValue === 'object' && editValue !== null) {
                return (
                    <div className="space-y-3">
                        <JsonEditor
                            value={editValue}
                            onChange={(newValue) => setEditValue(newValue)}
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => handleSaveEdit(paramName, varName as WorkflowVariableName)}
                                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 
                                         hover:bg-blue-700 rounded-md"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                );
            }

            // For simple values, use a text input
            return (
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={editValue as string}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        autoFocus
                    />
                    <button
                        onClick={() => handleSaveEdit(paramName, varName as WorkflowVariableName)}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 
                                 hover:bg-blue-700 rounded-md"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleCancelEdit}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        // Special handling for file values
        if (valueObj?.schema?.type === 'file') {
            return renderFileValue(valueObj);
        }

        // For all other values, use the VariableRenderer component
        return (
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <VariableRenderer
                        value={valueObj?.value}
                        schema={valueObj?.schema}
                        useEnhancedJsonView={true}
                        maxTextLength={MAX_TEXT_LENGTH}
                        maxArrayItems={MAX_ARRAY_LENGTH}
                        maxArrayItemLength={MAX_ARRAY_ITEM_LENGTH}
                    />
                </div>
                <button
                    onClick={() => handleStartEdit(paramName, valueObj?.value)}
                    className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                    Edit
                </button>
            </div>
        );
    };

    // Special handling for file selection
    const handleFileSelect = (paramName: string, varName: string) => {
        setSelectedParam({ paramName, varName });
        setShowFileSelector(true);
    };

    const handleFileSelected = (fileId: string) => {
        if (!selectedParam || !workflow) return;

        const { paramName, varName } = selectedParam;
        const updatedState = (workflow.state || []).map(variable => {
            if (variable.name === varName) {
                return {
                    ...variable,
                    value: {
                        file_id: fileId,
                        name: fileNames[fileId] || 'File'
                    }
                };
            }
            return variable;
        });

        updateWorkflowByAction({
            type: 'UPDATE_WORKFLOW',
            payload: {
                workflowUpdates: { state: updatedState }
            }
        });
        setShowFileSelector(false);
        setSelectedParam(null);
    };

    // Special handling for LLM prompt templates
    const handleEditTemplate = () => {
        setShowTemplateEditor(true);
    };

    return (
        <div className="space-y-6">
            {/* Tool Info Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Tool
                </h3>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {actionStep.tool.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {actionStep.tool.tool_type}
                        </span>
                    </div>
                    {actionStep.tool.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {actionStep.tool.description}
                        </p>
                    )}

                    {/* LLM Template Information */}
                    {actionStep.tool.tool_type === 'llm' && currentTemplate && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                                        Template:
                                    </span>
                                    <Link
                                        to={`/prompt/${currentTemplate.template_id}`}
                                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                    >
                                        {currentTemplate.name}
                                    </Link>
                                </div>
                                <button
                                    onClick={handleEditTemplate}
                                    className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                >
                                    Edit Template
                                </button>
                            </div>
                            {currentTemplate.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {currentTemplate.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Inputs
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    {Object.entries(inputValues).map(([paramName, valueObj]) => {
                        const param = actionStep.tool?.signature.parameters.find(p => p.name === paramName);
                        const varName = actionStep.parameter_mappings?.[paramName as any];

                        return (
                            <div key={paramName} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {paramName}
                                        </span>
                                        {param?.required && (
                                            <span className="ml-1 text-red-500">*</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {param?.schema.type}{param?.schema.is_array ? '[]' : ''}
                                    </span>
                                </div>

                                {param?.description && (
                                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                        {param.description}
                                    </p>
                                )}

                                {/* Special handling for file inputs */}
                                {param?.schema.type === 'file' ? (
                                    <div className="mt-2">
                                        {valueObj?.value?.file_id ? (
                                            renderFileValue(valueObj)
                                        ) : (
                                            <button
                                                onClick={() => handleFileSelect(paramName, varName as string)}
                                                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 
                                                         dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                                         dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                            >
                                                Select File
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        {renderEditableValue(paramName, varName as string, valueObj)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Outputs Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Outputs
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    {Object.entries(outputValues).map(([outputName, valueObj]) => {
                        const output = actionStep.tool?.signature.outputs.find(o => o.name === outputName);

                        // Ensure schema has correct is_array property based on actual value
                        let schema = valueObj?.schema || output?.schema;
                        if (schema && Array.isArray(valueObj?.value)) {
                            schema = { ...schema, is_array: true };
                        }

                        return (
                            <div key={outputName} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {outputName}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {schema?.type}{schema?.is_array ? '[]' : ''}
                                    </span>
                                </div>

                                {output?.description && (
                                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                        {output.description}
                                    </p>
                                )}

                                <div className="mt-2">
                                    <VariableRenderer
                                        value={valueObj?.value}
                                        schema={schema}
                                        isMarkdown={true}
                                        maxTextLength={MAX_TEXT_LENGTH}
                                        maxArrayItems={MAX_ARRAY_LENGTH}
                                        maxArrayItemLength={MAX_ARRAY_ITEM_LENGTH}
                                        useEnhancedJsonView={true}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* File Selector Dialog */}
            {showFileSelector && (
                <Dialog
                    title="Select File"
                    onClose={() => setShowFileSelector(false)}
                    isOpen={showFileSelector}
                >
                    <FileLibrary
                        onFileSelect={handleFileSelected}
                    />
                </Dialog>
            )}

            {/* Template Editor Dialog */}
            {currentTemplate && (
                <TemplateEditorDialog
                    isOpen={showTemplateEditor}
                    template={currentTemplate}
                    onClose={() => setShowTemplateEditor(false)}
                />
            )}
        </div>
    );
};

export default ActionStepRunner; 