import React from 'react';
import { workflowTemplates } from '../../types/workflow-templates';

interface WorkflowTemplateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (templateId: string) => void;
    onCreateEmpty: () => void;
}

const WorkflowTemplateDialog: React.FC<WorkflowTemplateDialogProps> = ({
    isOpen,
    onClose,
    onSelectTemplate,
    onCreateEmpty
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Workflow</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-400">
                        Start with a template or create an empty workflow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Empty workflow option */}
                    <div
                        onClick={onCreateEmpty}
                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all"
                    >
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            Empty Workflow
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Start from scratch with a blank workflow.
                        </p>
                    </div>

                    {/* Template options */}
                    {workflowTemplates.map(template => (
                        <div
                            key={template.id}
                            onClick={() => onSelectTemplate(template.id)}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all"
                        >
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                {template.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {template.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 mr-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkflowTemplateDialog; 