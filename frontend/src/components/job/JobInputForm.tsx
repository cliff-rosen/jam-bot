import React, { useState } from 'react';
import { WorkflowVariable } from '../../types/workflows';
import Dialog from '../common/Dialog';
import FileLibrary from '../FileLibrary';
import { fileApi } from '../../lib/api/fileApi';

interface JobInputFormProps {
    workflowInputs: WorkflowVariable[];
    inputValues: Record<string, any>;
    inputErrors: Record<string, string>;
    setInputValue: (variableId: string, value: any) => void;
}

export const JobInputForm: React.FC<JobInputFormProps> = ({
    workflowInputs,
    inputValues,
    inputErrors,
    setInputValue
}) => {
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [selectedInput, setSelectedInput] = useState<string | null>(null);
    const [fileNames, setFileNames] = useState<Record<string, string>>({});

    // Load file names for file values
    React.useEffect(() => {
        const loadFileNames = async () => {
            const newFileNames: Record<string, string> = {};
            for (const input of workflowInputs) {
                if (input.schema.type === 'file' && inputValues[input.variable_id]?.file_id) {
                    try {
                        const fileInfo = await fileApi.getFile(inputValues[input.variable_id].file_id);
                        newFileNames[inputValues[input.variable_id].file_id] = fileInfo.name;
                    } catch (err) {
                        console.error('Error loading file name:', err);
                    }
                }
            }
            setFileNames(newFileNames);
        };
        loadFileNames();
    }, [workflowInputs, inputValues]);

    const isInputEmpty = (input: WorkflowVariable) => {
        const value = inputValues[input.variable_id];
        if (value === undefined || value === null || value === '') return true;
        if (input.schema.type === 'file') return !value.file_id;
        return false;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-4">
                Configure Job Inputs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Please provide the required inputs to start this job.
            </p>
            <div className="space-y-6">
                {workflowInputs.map(input => (
                    <div key={input.variable_id} className="space-y-2">
                        <label
                            htmlFor={input.variable_id}
                            className="block text-sm font-medium text-gray-900 dark:text-gray-50"
                        >
                            {input.name}
                            {isInputEmpty(input) && (
                                <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                            )}
                        </label>
                        {input.schema.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {input.schema.description}
                            </p>
                        )}
                        {input.schema.type === 'boolean' ? (
                            <div className="flex items-center">
                                <input
                                    id={input.variable_id}
                                    type="checkbox"
                                    checked={!!inputValues[input.variable_id]}
                                    onChange={(e) => setInputValue(input.variable_id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={input.variable_id}
                                    className="ml-2 text-sm text-gray-900 dark:text-gray-50"
                                >
                                    Enable
                                </label>
                            </div>
                        ) : input.schema.type === 'file' ? (
                            <div>
                                {inputValues[input.variable_id]?.file_id ? (
                                    <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {fileNames[inputValues[input.variable_id].file_id] || 'Loading...'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const content = await fileApi.getFileContent(inputValues[input.variable_id].file_id);
                                                            const win = window.open('', '_blank');
                                                            if (win) {
                                                                win.document.write(`
                                                                    <html>
                                                                        <head>
                                                                            <title>${fileNames[inputValues[input.variable_id].file_id]} - Content</title>
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
                                                <button
                                                    onClick={() => {
                                                        setSelectedInput(input.variable_id);
                                                        setShowFileSelector(true);
                                                    }}
                                                    className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                                             dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                                             dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                >
                                                    Change File
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSelectedInput(input.variable_id);
                                            setShowFileSelector(true);
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 
                                                 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 
                                                 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                    >
                                        Select File
                                    </button>
                                )}
                            </div>
                        ) : (
                            <input
                                id={input.variable_id}
                                type={input.schema.type === 'number' ? 'number' : 'text'}
                                value={inputValues[input.variable_id] || ''}
                                onChange={(e) => setInputValue(input.variable_id, e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800
                                          ${inputErrors[input.variable_id]
                                        ? 'border-red-500 dark:border-red-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                    } text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500`}
                            />
                        )}
                        {inputErrors[input.variable_id] && (
                            <p className="text-sm text-red-500 dark:text-red-400">
                                {inputErrors[input.variable_id]}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* File Selector Dialog */}
            {showFileSelector && selectedInput && (
                <Dialog
                    title="Select File"
                    onClose={() => {
                        setShowFileSelector(false);
                        setSelectedInput(null);
                    }}
                    isOpen={showFileSelector}
                >
                    <FileLibrary
                        onFileSelect={(fileId: string) => {
                            setInputValue(selectedInput, { file_id: fileId });
                            setShowFileSelector(false);
                            setSelectedInput(null);
                        }}
                    />
                </Dialog>
            )}
        </div>
    );
}; 