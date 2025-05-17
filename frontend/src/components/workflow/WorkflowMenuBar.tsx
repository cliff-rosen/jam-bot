import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../../context/WorkflowContext';

interface WorkflowMenuBarProps {
    isEditMode: boolean;
    onToggleEditMode: () => void;
}

const WorkflowMenuBar: React.FC<WorkflowMenuBarProps> = ({
    isEditMode,
    onToggleEditMode,
}) => {
    const navigate = useNavigate();
    const { workflow, hasUnsavedChanges, saveWorkflow, exitWorkflow, updateWorkflowByAction } = useWorkflows();
    const [editingName, setEditingName] = useState(false);

    // Auto-enter edit mode for new workflows
    useEffect(() => {
        if (workflow?.workflow_id === 'new' && !editingName) {
            setEditingName(true);
        }
    }, [workflow?.workflow_id]);

    if (!workflow) return null;

    const handleBack = async () => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm('You have unsaved changes. Do you want to save before leaving?');
            if (shouldSave) {
                try {
                    await saveWorkflow();
                    exitWorkflow();
                    navigate('/');
                } catch (err) {
                    console.error('Error saving workflow:', err);
                    if (window.confirm('Failed to save changes. Leave anyway?')) {
                        exitWorkflow();
                        navigate('/');
                    }
                }
            } else {
                exitWorkflow();
                navigate('/');
            }
        } else {
            exitWorkflow();
            navigate('/');
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 w-full">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Left Section - Back Button and Title */}
                    <div className="flex items-center">
                        <button
                            onClick={handleBack}
                            className="inline-flex items-center justify-center
                                 px-1 py-1 text-sm font-medium
                                 text-gray-600 hover:text-gray-800 hover:bg-gray-100
                                 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                 transition-colors rounded-md mr-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="flex items-center">
                            {isEditMode && editingName ? (
                                <input
                                    type="text"
                                    value={workflow.name}
                                    onChange={(e) => updateWorkflowByAction({
                                        type: 'UPDATE_WORKFLOW',
                                        payload: {
                                            workflowUpdates: { name: e.target.value }
                                        }
                                    })}
                                    onBlur={() => setEditingName(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setEditingName(false);
                                        }
                                    }}
                                    autoFocus
                                    placeholder="Enter workflow name"
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 
                                         rounded-md bg-white dark:bg-gray-700 
                                         text-gray-900 dark:text-gray-100
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                         min-w-[200px]"
                                />
                            ) : (
                                <div className="flex items-center">
                                    <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                        {workflow.name || 'Untitled Workflow'}
                                        {hasUnsavedChanges && ' *'}
                                    </h1>
                                    {isEditMode && (
                                        <button
                                            onClick={() => setEditingName(true)}
                                            className="inline-flex items-center justify-center rounded-md w-7 h-7 ml-2
                                                 text-gray-400 hover:text-gray-500 hover:bg-gray-100
                                                 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800
                                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                                 transition-colors"
                                            title="Edit workflow name"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Edit/Run Mode Toggle */}
                        <div className="flex items-center">
                            {/* Mode Indicator */}
                            <div className={`inline-flex items-center text-sm mr-2
                                     ${!isEditMode
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-gray-600 dark:text-gray-300'
                                }`}
                            >
                                {!isEditMode ? (
                                    <>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Run Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span className="font-medium">Edit Mode</span>
                                    </>
                                )}
                            </div>

                            {/* Mode Toggle Button */}
                            <button
                                onClick={onToggleEditMode}
                                className="inline-flex items-center justify-center rounded-md
                                     px-3 py-1.5 text-sm font-medium
                                     bg-gray-100 text-gray-700 hover:bg-gray-200
                                     dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                     transition-colors"
                            >
                                Switch to {isEditMode ? 'Run' : 'Edit'}
                            </button>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={saveWorkflow}
                            disabled={!hasUnsavedChanges}
                            className={`inline-flex items-center justify-center rounded-md
                                  px-3 py-1.5 text-sm font-medium
                                  ${hasUnsavedChanges
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                }
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                  transition-colors`}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowMenuBar; 