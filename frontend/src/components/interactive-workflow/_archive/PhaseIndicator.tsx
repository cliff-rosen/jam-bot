import React from 'react';
import { WorkflowPhase, SetupSubPhase } from './types';

interface PhaseIndicatorProps {
    currentPhase: WorkflowPhase;
    currentSubPhase: SetupSubPhase;
    isQuestionComplete: boolean;
    isWorkflowAgreed: boolean;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
    currentPhase,
    currentSubPhase,
    isQuestionComplete,
    isWorkflowAgreed
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            {/* Setup Phase */}
            <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentPhase === 'setup'
                        ? 'bg-blue-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}>
                    1
                </div>
                <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Setup
                    </div>
                    {currentPhase === 'setup' && (
                        <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${currentSubPhase === 'question_development'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : isQuestionComplete
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                Question Development
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${currentSubPhase === 'workflow_development'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : isWorkflowAgreed
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}>
                                Workflow Development
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Connector */}
            <div className="flex-1 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700" />

            {/* Execution Phase */}
            <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentPhase === 'execution'
                        ? 'bg-blue-500 text-white'
                        : currentPhase === 'setup' && isWorkflowAgreed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                    2
                </div>
                <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Execution
                    </div>
                    {currentPhase === 'execution' && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Running workflow steps
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 