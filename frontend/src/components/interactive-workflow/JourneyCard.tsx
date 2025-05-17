import React from 'react';
import { Journey, JourneyState } from './types';

interface JourneyCardProps {
    journey: Journey | null;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({ journey }) => {
    if (!journey) {
        return (
            <div className="h-24 relative p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 opacity-60">
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No journey started yet
                    </p>
                </div>
            </div>
        );
    }

    const isActive = journey.state !== 'AWAITING_GOAL' && journey.state !== 'WORKFLOW_COMPLETE';
    const isRecording = journey.state === 'WORKFLOW_IN_PROGRESS';

    return (
        <div className={`h-24 relative p-4 rounded-lg transition-all duration-300 ${isActive
            ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700'
            : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 opacity-60'
            }`}>
            <div className="flex h-full">
                {/* Left Column */}
                <div className="w-2/3 overflow-hidden pr-4">
                    <div className="space-y-1">
                        {isActive ? (
                            <>
                                <div>
                                    <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {journey.title}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {journey.goal}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {journey.state === 'AWAITING_GOAL'
                                        ? 'No goal defined yet'
                                        : 'Journey completed'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-1/3 border-l border-gray-200 dark:border-gray-700 pl-4">
                    {/* Recording Light */}
                    {isActive && (
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isRecording
                                ? 'bg-green-500 animate-pulse'
                                : 'bg-green-500'
                                }`} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {isRecording ? 'IN PROGRESS' : 'Active'}
                            </span>
                        </div>
                    )}

                    {/* Deliverable */}
                    {isActive && (
                        <div className="space-y-0.5">
                            <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                Deliverable
                            </h3>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                <p className="truncate">{journey.deliverable.name}</p>
                                <p className="truncate">{journey.deliverable.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 