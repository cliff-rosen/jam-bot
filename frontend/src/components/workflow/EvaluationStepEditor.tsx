import React from 'react';
import { WorkflowStep, WorkflowVariableName } from '../../types/workflows';
import { useWorkflows } from '../../context/WorkflowContext';
import VariablePathSelector from './VariablePathSelector';

interface EvaluationStepEditorProps {
    step: WorkflowStep;
    onStepUpdate: (step: WorkflowStep) => void;
}

const EvaluationStepEditor: React.FC<EvaluationStepEditorProps> = ({
    step,
    onStepUpdate
}) => {
    const { workflow } = useWorkflows();

    // Initialize evaluation config if not present
    const evaluation_config = step.evaluation_config || {
        conditions: [],
        default_action: 'continue' as const,
        maximum_jumps: 3
    };

    const handleAddCondition = () => {
        onStepUpdate({
            ...step,
            evaluation_config: {
                ...evaluation_config,
                conditions: [
                    ...evaluation_config.conditions,
                    {
                        condition_id: crypto.randomUUID(),
                        variable: '' as WorkflowVariableName,
                        operator: 'equals' as const,
                        value: '',
                        target_step_index: undefined
                    }
                ]
            }
        });
    };

    const handleRemoveCondition = (index: number) => {
        onStepUpdate({
            ...step,
            evaluation_config: {
                ...evaluation_config,
                conditions: evaluation_config.conditions.filter((_, i) => i !== index)
            }
        });
    };

    const handleConditionChange = (index: number, field: 'variable' | 'operator' | 'value' | 'target_step_index', value: any) => {
        const updatedConditions = [...evaluation_config.conditions];
        updatedConditions[index] = {
            ...updatedConditions[index],
            [field]: value
        };

        onStepUpdate({
            ...step,
            evaluation_config: {
                ...evaluation_config,
                conditions: updatedConditions
            }
        });
    };

    const handleDefaultActionChange = (action: 'continue' | 'end') => {
        onStepUpdate({
            ...step,
            evaluation_config: {
                ...evaluation_config,
                default_action: action
            }
        });
    };

    const handleMaximumJumpsChange = (value: string) => {
        console.log('handleMaximumJumpsChange', value);
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0) return;

        onStepUpdate({
            ...step,
            evaluation_config: {
                ...evaluation_config,
                maximum_jumps: numValue
            }
        });
    };

    // Get all available variables for condition evaluation
    const availableVariables = [
        ...(workflow?.state || []),
        ...workflow?.steps
            .filter(s => s.sequence_number < step.sequence_number)
            .flatMap(s => Object.entries(s.output_mappings || {})
                .map(([_, varName]) => ({
                    name: varName,
                    description: `Output from step ${s.label}`
                }))
            ) || []
    ];

    return (
        <div className="space-y-4">
            {/* Conditions List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Conditions
                    </h3>
                    <button
                        onClick={handleAddCondition}
                        className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                        Add Condition
                    </button>
                </div>

                {evaluation_config.conditions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No conditions set. Add a condition to control workflow branching.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {evaluation_config.conditions.map((condition, index) => (
                            <div key={condition.condition_id || index} className="border dark:border-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Condition {index + 1}
                                    </h4>
                                    <button
                                        onClick={() => handleRemoveCondition(index)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Variable Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Variable
                                        </label>
                                        <VariablePathSelector
                                            variables={workflow?.state || []}
                                            value={condition.variable}
                                            onChange={(value) => handleConditionChange(index, 'variable', value as WorkflowVariableName)}
                                            placeholder="Select a variable"
                                        />
                                    </div>

                                    {/* Operator Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Operator
                                        </label>
                                        <select
                                            value={condition.operator}
                                            onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="equals">equals</option>
                                            <option value="not_equals">not equals</option>
                                            <option value="greater_than">greater than</option>
                                            <option value="less_than">less than</option>
                                            <option value="contains">contains</option>
                                            <option value="not_contains">not contains</option>
                                        </select>
                                    </div>

                                    {/* Value Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Value
                                        </label>
                                        <input
                                            type="text"
                                            value={condition.value}
                                            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            placeholder="Enter comparison value"
                                        />
                                    </div>

                                    {/* Target Step Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Jump to Step
                                        </label>
                                        <select
                                            value={condition.target_step_index}
                                            onChange={(e) => handleConditionChange(index, 'target_step_index', e.target.value ? parseInt(e.target.value) : undefined)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="">Continue to next step</option>
                                            {workflow?.steps.map((s, i) => (
                                                <option
                                                    key={`step-${s.step_id}`}
                                                    value={i}
                                                    disabled={i === step.sequence_number}
                                                >
                                                    {s.label} {i === step.sequence_number ? '(current step - not allowed)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Maximum Jumps Setting */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Maximum Jumps
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Maximum number of times conditions will be checked before forcing continue
                </p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        value={evaluation_config.maximum_jumps}
                        onChange={(e) => handleMaximumJumpsChange(e.target.value)}
                        className="w-24 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {evaluation_config.maximum_jumps === 0 ? '(No limit)' : `jump${evaluation_config.maximum_jumps === 1 ? '' : 's'}`}
                    </span>
                </div>
            </div>

            {/* Default Action */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Default Action
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    What should happen if no conditions match?
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => handleDefaultActionChange('continue')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${evaluation_config.default_action === 'continue'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        Continue to Next Step
                    </button>
                    <button
                        onClick={() => handleDefaultActionChange('end')}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${evaluation_config.default_action === 'end'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        End Workflow
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EvaluationStepEditor; 