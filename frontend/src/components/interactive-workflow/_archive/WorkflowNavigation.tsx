import React from 'react';
import { WorkflowPhase, SetupStage, ExecutionStage } from './types';

interface WorkflowNavigationProps {
    phase: WorkflowPhase;
    setupStage: SetupStage;
    executionStage: ExecutionStage;
    isProcessing: boolean;
    onNext: () => void;
    onBack: () => void;
    onRestart: () => void;
}

const WorkflowNavigation: React.FC<WorkflowNavigationProps> = ({
    phase,
    setupStage,
    executionStage,
    isProcessing,
    onNext,
    onBack,
    onRestart
}) => {
    // Define all possible stages in order
    const setupStages: SetupStage[] = ['initial', 'clarification_requested', 'request_confirmation', 'workflow_designing', 'workflow_explanation', 'workflow_ready'];
    const executionStages: ExecutionStage[] = ['workflow_started', 'compiling_songs', 'retrieving_lyrics', 'analyzing_lyrics', 'tabulating_results', 'workflow_complete'];

    // Get current stage array and index
    const currentStages = phase === 'setup' ? setupStages : executionStages;
    const currentStage = phase === 'setup' ? setupStage : executionStage;
    const currentIndex = currentStages.indexOf(currentStage);

    // Helper function to get stage display name
    const getStageDisplayName = (stage: SetupStage | ExecutionStage) => {
        return stage
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Navigation Controls */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onBack}
                            disabled={currentIndex === 0 || isProcessing}
                            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                                ${currentIndex === 0 || isProcessing
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                } transition-colors duration-200`}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>

                        <button
                            onClick={onNext}
                            disabled={currentIndex === currentStages.length - 1 || isProcessing}
                            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                                ${currentIndex === currentStages.length - 1 || isProcessing
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                } transition-colors duration-200`}
                        >
                            Next
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Current Stage Display */}
                    <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Current Stage:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {getStageDisplayName(currentStage)}
                        </span>
                    </div>

                    {/* Restart Button */}
                    <button
                        onClick={onRestart}
                        className="inline-flex items-center px-3 py-2 border border-red-500 rounded-md text-sm font-medium
                            text-red-500 bg-white hover:bg-red-50 dark:bg-transparent dark:hover:bg-red-900/20
                            transition-colors duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restart
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                            <div
                                style={{ width: `${((currentIndex + 1) / currentStages.length) * 100}%` }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                            />
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{phase === 'setup' ? 'Setup' : 'Execution'} Phase</span>
                        <span>{currentIndex + 1} of {currentStages.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowNavigation; 