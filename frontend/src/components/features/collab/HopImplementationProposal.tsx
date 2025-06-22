import React from 'react';
import { CheckCircle, XCircle, X, Settings, Play } from 'lucide-react';
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
        <div className="h-full overflow-auto bg-white dark:bg-gray-900">
            {/* Clean Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-8 py-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Implementation Proposal
                            </span>
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                            {hop.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {hop.description}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="px-8 py-8 space-y-8">
                {/* Tool Steps */}
                {hop.tool_steps && hop.tool_steps.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Implementation Steps
                            </h2>
                        </div>

                        <div className="grid gap-3">
                            {hop.tool_steps.map((step: ToolStep, idx: number) => (
                                <div key={step.id} className="group bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-4 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white mb-1">
                                                    {step.description}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    Tool: {step.tool_id}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${step.status === ExecutionStatus.COMPLETED
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                                : step.status === ExecutionStatus.RUNNING
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                                    : step.status === ExecutionStatus.FAILED
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                }`}>
                                                {step.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Implementation Summary */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Ready to Execute
                        </h2>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            This implementation is ready to be executed. The system will run through each step sequentially,
                            using the specified tools to accomplish the hop's objectives.
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end gap-4">
                        <button
                            onClick={onReject}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        >
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Reject
                            </div>
                        </button>
                        <button
                            onClick={() => onAccept(hop)}
                            className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Accept Implementation
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Implementation proposal generated at {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
}; 