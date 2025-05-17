import React from 'react';
import { PromptTemplate } from '../types/prompts';
import PromptTemplateEditor from './PromptTemplateEditor';

interface TemplateEditorDialogProps {
    isOpen: boolean;
    template: PromptTemplate | null;
    onClose: () => void;
    onTemplateChange?: (templateId: string) => void;
}

/**
 * A reusable dialog component for editing prompt templates
 * Can be used in both ActionStepRunner and ActionStepEditor
 * Uses a full-screen approach similar to WorkflowConfig
 */
const TemplateEditorDialog: React.FC<TemplateEditorDialogProps> = ({
    isOpen,
    template,
    onClose,
    onTemplateChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {template ? 'Edit Prompt Template' : 'Create Prompt Template'}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {template ? 'Modify the template settings and content.' : 'Create a new prompt template for your workflow.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close dialog"
                    >
                        <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <PromptTemplateEditor
                        template={template}
                        onClose={onClose}
                        onTemplateChange={onTemplateChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default TemplateEditorDialog; 