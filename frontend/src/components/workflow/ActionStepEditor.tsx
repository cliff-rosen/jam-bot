// Rename from ActionEditor.tsx
// This is for editing action steps in edit mode 

import React, { useEffect, useState } from 'react';
import { WorkflowStep, WorkflowStepType } from '@/types/workflows';
import { Tool } from '@/types/tools';
import { toolApi } from '@/lib/api/toolApi';
import EvaluationStepEditor from '@/components/workflow/EvaluationStepEditor';
import ToolActionEditor from '@/components/workflow/ToolActionEditor';
import { useWorkflows } from '@/context/WorkflowContext';

interface ActionStepEditorProps {
    step: WorkflowStep;
    onStepUpdate: (step: WorkflowStep) => void;
    onDeleteRequest: () => void;
}

const ActionStepEditor: React.FC<ActionStepEditorProps> = ({
    step,
    onStepUpdate,
    onDeleteRequest
}) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { updateWorkflowByAction } = useWorkflows();

    useEffect(() => {
        const loadTools = async () => {
            try {
                setLoading(true);
                const availableTools = await toolApi.getTools();
                setTools(availableTools);
            } catch (err) {
                console.error('Error loading tools:', err);
                setError('Failed to load tools');
            } finally {
                setLoading(false);
            }
        };
        loadTools();
    }, []);

    const handleTypeChange = () => {
        updateWorkflowByAction({
            type: 'UPDATE_STEP_TYPE',
            payload: {
                stepId: step.step_id
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-3">{error}</div>;
    }

    return (
        <div className="space-y-3">
            {/* Step Basic Information - More Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Basic Step Information
                    </h3>
                    {/* Step Type Selection */}
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900">
                        <button
                            onClick={handleTypeChange}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors
                                ${step.step_type === WorkflowStepType.ACTION
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                        >
                            Action
                        </button>
                        <button
                            onClick={handleTypeChange}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors
                                ${step.step_type === WorkflowStepType.EVALUATION
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                        >
                            Evaluation
                        </button>
                    </div>
                </div>

                {/* Label and Description - More Compact */}
                <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Step Label
                        </label>
                        <input
                            type="text"
                            value={step.label}
                            onChange={(e) => onStepUpdate({ ...step, label: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="Enter a descriptive label"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={step.description}
                            onChange={(e) => onStepUpdate({ ...step, description: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={1}
                            placeholder="Describe what this step does"
                        />
                    </div>
                </div>
            </div>

            {/* Step Configuration */}
            {step.step_type === WorkflowStepType.ACTION ? (
                <ToolActionEditor
                    step={step}
                    tools={tools}
                    onStepUpdate={onStepUpdate}
                />
            ) : (
                <EvaluationStepEditor
                    step={step}
                    onStepUpdate={onStepUpdate}
                />
            )}
        </div>
    );
};

export default ActionStepEditor; 