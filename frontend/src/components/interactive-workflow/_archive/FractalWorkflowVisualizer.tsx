import React from 'react';
import { WorkflowStep, StepDetails } from './types';

interface FractalWorkflowVisualizerProps {
    steps: WorkflowStep[];
    stepDetails: Record<string, StepDetails>;
    currentStepId: string | null;
    onStepSelect: (stepId: string) => void;
    onAddSubStep?: (parentId: string) => void;
}

const StepNode: React.FC<{
    step: WorkflowStep;
    stepDetails: StepDetails;
    isActive: boolean;
    onSelect: () => void;
    onAddSubStep?: () => void;
    level: number;
}> = ({ step, stepDetails, isActive, onSelect, onAddSubStep, level }) => {
    return (
        <div className={`
            ml-${level * 4} 
            mb-2 
            p-3 
            rounded-lg 
            border 
            transition-all
            ${isActive
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }
        `}>
            <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div className="relative">
                    <div className={`
                        w-2 h-2 
                        rounded-full 
                        ${step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            step.status === 'completed' ? 'bg-green-500' :
                                step.status === 'failed' ? 'bg-red-500' :
                                    'bg-gray-400'
                        }
                    `} />
                </div>

                {/* Step Name and Tools */}
                <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {step.name}
                    </h4>
                    {step.tools && step.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {step.tools.map(tool => (
                                <span
                                    key={tool}
                                    className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                >
                                    {tool}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSelect}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <span className="sr-only">Select step</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    {onAddSubStep && (
                        <button
                            onClick={onAddSubStep}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <span className="sr-only">Add sub-step</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Description */}
            {step.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                </p>
            )}

            {/* Sub-steps */}
            {step.subSteps && step.subSteps.length > 0 && (
                <div className="mt-3 space-y-2">
                    {step.subSteps.map(subStep => (
                        <StepNode
                            key={subStep.id}
                            step={subStep}
                            stepDetails={stepDetails[subStep.id]}
                            isActive={false}
                            onSelect={() => onSelect(subStep.id)}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FractalWorkflowVisualizer: React.FC<FractalWorkflowVisualizerProps> = ({
    steps,
    stepDetails,
    currentStepId,
    onStepSelect,
    onAddSubStep
}) => {
    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="space-y-2">
                {steps.map(step => (
                    <StepNode
                        key={step.id}
                        step={step}
                        stepDetails={stepDetails[step.id]}
                        isActive={step.id === currentStepId}
                        onSelect={() => onStepSelect(step.id)}
                        onAddSubStep={onAddSubStep ? () => onAddSubStep(step.id) : undefined}
                        level={0}
                    />
                ))}
            </div>
        </div>
    );
}; 