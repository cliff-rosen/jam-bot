import React from 'react';

interface PromptMenuBarProps {
    name: string;
    isSaving: boolean;
    isTesting: boolean;
    hasUnsavedChanges: boolean;
    onSave: () => void;
    onTest: () => void;
    onBack: () => void;
}

const PromptMenuBar: React.FC<PromptMenuBarProps> = ({
    name,
    isSaving,
    isTesting,
    hasUnsavedChanges,
    onSave,
    onTest,
    onBack
}) => {
    return (
        <div className="bg-gray-50 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 w-full">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Left Section - Back Button and Title */}
                    <div className="flex items-center">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center justify-center
                                 px-1 py-1 text-sm font-medium
                                 text-gray-600 hover:text-gray-800 hover:bg-gray-100
                                 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
                                 transition-colors rounded-md mr-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div className="flex items-center">
                            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                {name || 'Untitled Template'}
                                {hasUnsavedChanges && ' *'}
                            </h1>
                        </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex items-center space-x-4">
                        {/* Test Button */}
                        <button
                            onClick={onTest}
                            disabled={isTesting}
                            className="inline-flex items-center justify-center rounded-md
                                 px-3 py-1.5 text-sm font-medium
                                 bg-gray-100 text-gray-700 hover:bg-gray-200
                                 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
                                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isTesting ? 'Testing...' : 'Test Template'}
                        </button>

                        {/* Save Button */}
                        <button
                            onClick={onSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className={`inline-flex items-center justify-center rounded-md
                                 px-3 py-1.5 text-sm font-medium
                                 ${hasUnsavedChanges
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                }
                                 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300
                                 transition-colors`}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptMenuBar; 