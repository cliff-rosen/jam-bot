import React from 'react';
import { CheckCircle, XCircle, X, ArrowRight, Target, Package } from 'lucide-react';
import { Hop } from '@/types/workflow';

interface HopProposalProps {
    hop: Hop;
    proposedAssets?: any[];
    isAlreadyAccepted: boolean;
    needsAcceptance: boolean;
    onAccept: (hop: Hop, proposedAssets?: any[]) => void;
    onReject: () => void;
    onClose: () => void;
}

export const HopProposal: React.FC<HopProposalProps> = ({
    hop,
    proposedAssets,
    isAlreadyAccepted,
    needsAcceptance,
    onAccept,
    onReject,
    onClose
}) => {
    // Get input assets from hop state
    const inputAssets = Object.entries(hop.input_mapping).map(([localKey, missionAssetId]) => {
        const asset = hop.hop_state[localKey];
        return { localKey, missionAssetId, asset };
    }).filter(item => item.asset);

    return (
        <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
            <div className="p-6 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {hop.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            {hop.description}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Status Badge */}
                {isAlreadyAccepted && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 mb-6">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accepted
                    </div>
                )}

                {/* Final Step Indicator */}
                {hop.is_final && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3" />
                            <div>
                                <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                                    Final Step
                                </h3>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    This will complete your mission and produce the final results.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Available Assets Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center mb-4">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Using Available Assets
                        </h3>
                    </div>

                    {inputAssets.length > 0 ? (
                        <div className="space-y-3">
                            {inputAssets.map(({ asset, localKey }) => (
                                <div key={localKey} className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                    <div className="flex-1">
                                        <div className="font-medium text-blue-900 dark:text-blue-100">
                                            {asset?.name || localKey}
                                        </div>
                                        <div className="text-sm text-blue-600 dark:text-blue-300">
                                            {asset?.schema_definition?.type}
                                            {asset?.is_collection && ` (${asset?.collection_type})`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                            No specific inputs required for this step.
                        </p>
                    )}
                </div>

                {/* Next Step Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center mb-4">
                        <ArrowRight className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {hop.is_final ? 'Will Produce Final Results' : 'Next Step'}
                        </h3>
                    </div>

                    {hop.rationale && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            {hop.rationale}
                        </p>
                    )}

                    {!hop.is_final && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Note:</strong> This is an intermediate step. More hops will follow to complete your mission.
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {needsAcceptance && (
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                        </button>
                        <button
                            onClick={() => onAccept(hop, proposedAssets)}
                            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}; 