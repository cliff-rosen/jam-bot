import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
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

    // Get output assets from hop state
    const outputAssets = Object.entries(hop.output_mapping).map(([localKey, missionAssetId]) => {
        const asset = hop.hop_state[localKey];
        return { localKey, missionAssetId, asset };
    }).filter(item => item.asset);

    return (
        <div className="h-full overflow-auto">
            <div className="p-6 space-y-6">
                {/* Hop Proposal Header */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                                🎯 Hop Proposal {isAlreadyAccepted && <span className="text-sm font-normal">(Accepted)</span>}
                            </h3>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                {isAlreadyAccepted
                                    ? "This hop proposal has been accepted and added to the mission."
                                    : "Review the proposed hop details below. You can accept this proposal to proceed with implementation."
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 transition-colors"
                            title="Close hop proposal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Goal Section - Where We're Trying to Get */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                        🎯 Where We're Trying to Get
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">{hop.description}</p>

                    {/* Output Assets */}
                    {outputAssets.length > 0 && (
                        <div className="mt-3">
                            <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Will Produce:</h5>
                            <div className="space-y-2">
                                {outputAssets.map(({ asset, localKey }) => (
                                    <div key={localKey} className="bg-blue-100 dark:bg-blue-800/50 rounded p-2">
                                        <div className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                            {asset?.name || localKey}
                                        </div>
                                        <div className="text-xs text-blue-600 dark:text-blue-300">
                                            {asset?.schema_definition?.type}{asset?.is_collection ? ` (${asset?.collection_type})` : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Available Resources Section - What We Have */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                        📦 What We Have
                    </h4>

                    {inputAssets.length > 0 ? (
                        <div className="space-y-2">
                            {inputAssets.map(({ asset, localKey }) => (
                                <div key={localKey} className="bg-green-100 dark:bg-green-800/50 rounded p-2">
                                    <div className="text-xs font-medium text-green-800 dark:text-green-200">
                                        {asset?.name || localKey}
                                    </div>
                                    <div className="text-xs text-green-600 dark:text-green-300">
                                        {asset?.schema_definition?.type}{asset?.is_collection ? ` (${asset?.collection_type})` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-green-700 dark:text-green-300">No specific inputs required for this hop.</p>
                    )}
                </div>

                {/* Proposed Approach Section - What I Propose as Next Step */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                        💡 My Proposed Next Step
                    </h4>

                    {hop.rationale ? (
                        <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">{hop.rationale}</p>
                    ) : (
                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">This hop will transform the available inputs into the desired outputs.</p>
                    )}

                    {/* Hop Name */}
                    <div className="bg-purple-100 dark:bg-purple-800/50 rounded p-3">
                        <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            Hop: {hop.name}
                        </div>
                        {hop.is_final && (
                            <div className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                                ⭐ This is the final hop in the mission
                            </div>
                        )}
                    </div>

                    {/* Proposed New Assets */}
                    {proposedAssets && proposedAssets.length > 0 && (
                        <div className="mt-3">
                            <h5 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">Will Create New Assets:</h5>
                            <div className="space-y-2">
                                {proposedAssets.map((asset: any) => (
                                    <div key={asset.id} className="bg-purple-100 dark:bg-purple-800/50 rounded p-2">
                                        <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
                                            {asset.name}
                                        </div>
                                        <div className="text-xs text-purple-600 dark:text-purple-300">
                                            {asset.schema_definition?.type}{asset.is_collection ? ` (${asset.collection_type})` : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {needsAcceptance && (
                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            onClick={() => onAccept(hop, proposedAssets)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Accept Hop
                        </button>
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            <XCircle className="w-5 h-5 mr-2" />
                            Reject
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}; 