import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { Hop, ToolStep, ExecutionStatus } from '@/types/workflow';

interface HopImplementationProposalProps {
    hop: Hop;
    onAccept: (hop: Hop) => void;
    onReject: () => void;
    onClose: () => void;
}

export const HopImplementationProposal: React.FC<HopImplementationProposalProps> = ({
    hop,
    onAccept,
    onReject,
    onClose
}) => {
    return (
        <div className="h-full overflow-auto">
            <div className="p-6 space-y-6">
                {/* Hop Implementation Proposal Header */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                                Hop Implementation Proposal
                            </h3>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                Review the proposed hop implementation below. You can accept this implementation to proceed with execution.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
                            title="Close hop implementation proposal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Hop Implementation Details */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Hop Name</h4>
                        <p className="text-base text-gray-900 dark:text-gray-100">{hop.name}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Description</h4>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{hop.description}</p>
                    </div>

                    {/* Tool Steps */}
                    {hop.tool_steps && hop.tool_steps.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Tool Steps</h4>
                            <div className="space-y-3">
                                {hop.tool_steps.map((step: ToolStep, idx: number) => (
                                    <div key={step.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Step {idx + 1}: {step.description}
                                                </h5>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Tool: {step.tool_id}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${step.status === ExecutionStatus.COMPLETED
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                                                : step.status === ExecutionStatus.RUNNING
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                                                    : step.status === ExecutionStatus.FAILED
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
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

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            onClick={() => onAccept(hop)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Accept Implementation
                        </button>
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <XCircle className="w-5 h-5 mr-2" />
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}; 