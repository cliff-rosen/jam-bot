import React from 'react';
import { WorkflowStep, StepDetails } from './types';

interface WorkAreaProps {
    currentStep: WorkflowStep | null;
    stepDetails: StepDetails | null;
}

export const WorkArea: React.FC<WorkAreaProps> = ({
    currentStep,
    stepDetails
}) => {
    return (
        <div className="overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Work Area
            </h3>
            {currentStep ? (
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Current Step
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {currentStep.description}
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Progress
                        </h4>
                        <div className="space-y-2">
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${stepDetails?.progress || 0}%` }}
                                />
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {stepDetails?.progress || 0}% Complete
                            </div>
                        </div>
                    </div>
                    {/* Add more work area content here */}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Select a step to view its details
                </div>
            )}
        </div>
    );
}; 