import React from 'react';
import { Hop } from '@/types/workflow';
import { getHopStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';

interface HopSectionProps {
    hop: Hop | null;
}

const HopSection: React.FC<HopSectionProps> = ({ hop }) => {
    if (!hop) {
        return null;
    }

    const hopStatus = getHopStatusDisplay(hop.status);

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Current Hop: {hop.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {hop.description || 'No description provided'}
                    </p>
                </div>
                <div className={getStatusBadgeClass(hopStatus.color)}>
                    {hopStatus.icon}
                    <span>{hopStatus.text}</span>
                </div>
            </div>

            {hop.goal && (
                <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Goal</h4>
                    <p className="text-gray-600 dark:text-gray-400">{hop.goal}</p>
                </div>
            )}

            {hop.success_criteria && hop.success_criteria.length > 0 && (
                <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Success Criteria</h4>
                    <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400">
                        {hop.success_criteria.map((criteria, idx) => (
                            <li key={idx}>{criteria}</li>
                        ))}
                    </ul>
                </div>
            )}

            {hop.tool_steps && hop.tool_steps.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Tool Steps ({hop.tool_steps.length})
                    </h4>
                    <div className="space-y-2">
                        {hop.tool_steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                        {idx + 1}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {step.tool_id}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {step.description || 'No description'}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${step.status === 'completed'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                                            : step.status === 'failed'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                                                : step.status === 'executing'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400'
                                        }`}>
                                        {step.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HopSection; 