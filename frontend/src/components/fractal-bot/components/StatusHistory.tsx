import React from 'react';

interface StatusHistoryProps {
    messages: string[];
}

const StatusHistory: React.FC<StatusHistoryProps> = ({ messages }) => {
    // Get last 3 messages (current + 2 history)
    const recentMessages = messages.slice(-3).reverse();

    return (
        <div className="p-2">
            <div className="flex flex-wrap gap-2">
                {recentMessages.map((message, index) => {
                    const isError = message.toLowerCase().includes('error');
                    const isSuccess = message.toLowerCase().includes('success') || message.toLowerCase().includes('complete');
                    const isWarning = message.toLowerCase().includes('warning');

                    return (
                        <div
                            key={index}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm ${isError
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                : isSuccess
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : isWarning
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {isError ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : isSuccess ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : isWarning ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span>{message}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatusHistory; 