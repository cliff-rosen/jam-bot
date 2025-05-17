import React from 'react';
import { WorkflowStep, StepDetails } from './types';

interface WorkflowStatusSummaryProps {
    steps: WorkflowStep[];
    stepDetails: Record<string, StepDetails>;
    currentStepIndex: number;
}

const WorkflowStatusSummary: React.FC<WorkflowStatusSummaryProps> = ({
    steps,
    stepDetails,
    currentStepIndex
}) => {
    // Calculate overall progress
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalProgress = (completedSteps / steps.length) * 100;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Workflow Execution Status
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Step {currentStepIndex + 1} of {steps.length}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Overall Progress:
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(totalProgress)}%
                    </span>
                </div>
            </div>

            {/* Step Status Pills */}
            <div className="flex items-center space-x-2">
                {steps.map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isPending = step.status === 'pending';
                    const isRunning = step.status === 'running';
                    const isCompleted = step.status === 'completed';
                    const isFailed = step.status === 'failed';

                    return (
                        <div
                            key={step.id}
                            className={`flex-1 h-2 rounded-full transition-all duration-200 ${isActive
                                ? 'bg-blue-500 dark:bg-blue-400 animate-pulse'
                                : isPending
                                    ? 'bg-gray-200 dark:bg-gray-700'
                                    : isRunning
                                        ? 'bg-yellow-400 dark:bg-yellow-500 animate-pulse'
                                        : isCompleted
                                            ? 'bg-green-500 dark:bg-green-400'
                                            : 'bg-red-500 dark:bg-red-400'
                                }`}
                        />
                    );
                })}
            </div>

            {/* Current Step Details */}
            {steps[currentStepIndex] && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {steps[currentStepIndex].name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {steps[currentStepIndex].description}
                    </p>
                    {stepDetails[steps[currentStepIndex].id]?.progress > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300 ${steps[currentStepIndex].status === 'running'
                                        ? 'animate-workflow-progress'
                                        : 'animate-pulse'
                                        }`}
                                    style={{ width: `${stepDetails[steps[currentStepIndex].id].progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorkflowStatusSummary; 