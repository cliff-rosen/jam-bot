import React from 'react';
import { WorkflowStepType } from '../../types/workflows';

interface WorkflowNavigationProps {
    isEditMode: boolean;
    isInputRequired: boolean;
    activeStep: number;
    totalSteps: number;
    step_type: WorkflowStepType;
    isLoading: boolean;
    stepExecuted: boolean;
    onBack: () => void;
    onNext: () => void;
    onExecute: () => void;
    onRestart: () => void;
    onInputSubmit: () => void;
    nextStepIndex?: number;
}

const WorkflowNavigation: React.FC<WorkflowNavigationProps> = ({
    isEditMode,
    isInputRequired,
    activeStep,
    totalSteps,
    step_type,
    isLoading,
    stepExecuted,
    onBack,
    onNext,
    onExecute,
    onRestart,
    onInputSubmit,
    nextStepIndex
}) => {
    // Only show navigation in run mode
    if (isEditMode) return null;

    const isLastStep = activeStep === totalSteps - 1;

    // Determine if we're jumping to a non-sequential step
    const isJumping = nextStepIndex !== undefined && nextStepIndex !== activeStep + 1;

    // Button text for next/jump action
    const nextButtonText = isJumping ? 'Jump' : 'Next Step';

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Left side - Back button */}
                    <div>
                        <button
                            onClick={onBack}
                            disabled={activeStep === 0}
                            className={`inline-flex items-center justify-center rounded-md
                                      px-3 py-1.5 text-sm font-medium
                                      ${activeStep === 0
                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }
                                      focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                                      transition-colors`}
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                    </div>

                    {/* Center - Step counter and action buttons */}
                    <div className="flex items-center space-x-4">

                        {/* Action buttons */}
                        {step_type === WorkflowStepType.ACTION && !isInputRequired && (
                            <button
                                onClick={onExecute}
                                disabled={isLoading}
                                className={`inline-flex items-center justify-center rounded-md
                                          px-3 py-1.5 text-sm font-medium
                                          ${isLoading
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
                                    }
                                          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                          transition-colors`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                        <span>Executing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{stepExecuted ? 'Re-execute Tool' : 'Execute Tool'}</span>
                                    </>
                                )}
                            </button>
                        )}

                        {step_type === WorkflowStepType.EVALUATION && !isInputRequired && (
                            <button
                                onClick={onExecute}
                                disabled={isLoading}
                                className={`inline-flex items-center justify-center rounded-md
                                          px-3 py-1.5 text-sm font-medium
                                          ${isLoading
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
                                    }
                                          focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500
                                          transition-colors`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                        <span>Evaluating...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{stepExecuted ? 'Re-evaluate' : 'Evaluate'}</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* Next button */}
                        {(stepExecuted) && (isJumping || !isLastStep) && (
                            <button
                                onClick={onNext}
                                disabled={isLoading}
                                className={`inline-flex items-center justify-center rounded-md
                                          px-3 py-1.5 text-sm font-medium
                                          ${isLoading
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                                    }
                                          focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
                                          transition-colors`}
                            >
                                <span>{nextButtonText}</span>
                                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Submit input button */}
                        {isInputRequired && (
                            <button
                                onClick={onInputSubmit}
                                disabled={isLoading}
                                className={`inline-flex items-center justify-center rounded-md
                                          px-3 py-1.5 text-sm font-medium
                                          ${isLoading
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                                    }
                                          focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500
                                          transition-colors`}
                            >
                                <span>{'Start Workflow'}</span>
                                <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* Restart button - show when on last step or when workflow needs restart */}
                        {(isLastStep && stepExecuted && !isJumping) && (
                            <button
                                onClick={onRestart}
                                className="inline-flex items-center justify-center rounded-md
                                         px-3 py-1.5 text-sm font-medium
                                         bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30
                                         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                         transition-colors"
                            >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Start New Run
                            </button>
                        )}
                    </div>

                    {/* Right side - Global restart button */}
                    <div>
                        <button
                            onClick={onRestart}
                            className="inline-flex items-center justify-center rounded-md
                                     px-3 py-1.5 text-sm font-medium
                                     text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700
                                     focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
                                     transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Restart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowNavigation; 