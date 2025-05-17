import React, { useState, useMemo } from 'react';
import { WorkflowStep } from '@/types/workflows';
import { usePromptTemplates } from '@/context/PromptTemplateContext';
import { toolApi } from '@/lib/api/toolApi';
import { ToolEngine } from '@/lib/tool/toolEngine';
import TemplateEditorDialog from '@/components/workflow/TemplateEditorDialog';

interface PromptTemplateSelectorProps {
    step: WorkflowStep;
    onTemplateChange: (templateId: string) => void;
}

const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
    step,
    onTemplateChange,
}) => {
    const { templates } = usePromptTemplates();
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const currentTemplate = useMemo(() =>
        templates.find(t => t.template_id === step.prompt_template_id),
        [templates, step.prompt_template_id]
    );

    if (!step.tool || step.tool.tool_type !== 'llm') {
        return null;
    }

    const handleTemplateSelect = async (templateId: string) => {
        if (templateId === 'new') {
            setIsCreating(true);
        } else {
            try {
                await ToolEngine.updateWorkflowStepWithTemplate(
                    step,
                    templateId
                );
                onTemplateChange(templateId);
            } catch (err) {
                console.error('Error updating step with template:', err);
            }
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Prompt Template
            </label>
            <div className="flex gap-1.5">
                <select
                    value={step.prompt_template_id || ''}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                    <option key="default" value="" disabled>Select a prompt template</option>
                    <option key="new" value="new" className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        + New Template
                    </option>
                    {templates.map(template => (
                        <option key={template.template_id} value={template.template_id}
                            className="text-xs text-gray-900 dark:text-gray-100">
                            {template.name}
                        </option>
                    ))}
                </select>

                {currentTemplate && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 
                                 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-600 
                                 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 
                                 transition-colors duration-200"
                    >
                        View
                    </button>
                )}
            </div>

            {/* Template Editor */}
            {currentTemplate && (
                <TemplateEditorDialog
                    isOpen={isEditing}
                    template={currentTemplate}
                    onTemplateChange={onTemplateChange}
                    onClose={() => setIsEditing(false)}
                />
            )}

            {/* New Template Creator */}
            <TemplateEditorDialog
                isOpen={isCreating}
                template={null}
                onTemplateChange={onTemplateChange}
                onClose={() => setIsCreating(false)}
            />
        </div>
    );
};

export default PromptTemplateSelector; 