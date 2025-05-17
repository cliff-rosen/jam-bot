import React from 'react';
import { WorkflowStep, StepDetails } from './types';

interface StepListProps {
    steps: WorkflowStep[];
    currentStepIndex: number;
    stepDetails: Record<string, StepDetails>;
    onStepSelect: (index: number) => void;
}

export const StepList: React.FC<StepListProps> = ({
    steps,
    currentStepIndex,
    stepDetails,
    onStepSelect
}) => {
    return (
        <div className="overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Workflow Steps
            </h3>
            <div className="space-y-2">
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = step.status === 'completed';
                    const isRunning = step.status === 'running';
                    const isFailed = step.status === 'failed';

                    return (
                        <div
                            key={step.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                : isCompleted
                                    ? 'border-green-200 dark:border-green-800 opacity-75'
                                    : !isActive
                                        ? 'border-gray-200 dark:border-gray-700 opacity-50 hover:opacity-100'
                                        : 'border-gray-200 dark:border-gray-700'
                                } ${!isActive && !isCompleted
                                    ? 'hover:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    : ''
                                }`}
                            onClick={() => onStepSelect(index)}
                        >
                            <div className="flex items-center justify-between">
                                <div className={!isActive && !isCompleted ? 'opacity-75' : ''}>
                                    <h5 className={`font-medium ${isActive
                                        ? 'text-gray-800 dark:text-gray-200'
                                        : isCompleted
                                            ? 'text-green-700 dark:text-green-300'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {index + 1}. {step.name}
                                    </h5>
                                    <p className={`text-sm ${isActive
                                        ? 'text-gray-600 dark:text-gray-400'
                                        : isCompleted
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-500 dark:text-gray-500'
                                        }`}>
                                        {step.description}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isCompleted
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : isRunning
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : isFailed
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                    }`}>
                                    {step.status}
                                </span>
                            </div>
                            {isRunning && (
                                <div className="mt-2">
                                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${stepDetails[step.id]?.progress || 0}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {stepDetails[step.id]?.progress || 0}%
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}; 