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
                {/* Hop Name */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Hop Name</h4>
                    <p className="text-lg text-gray-900 dark:text-gray-100">{hop.name}</p>
                </div>

                {/* Description */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Description</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{hop.description}</p>
                </div>

                {/* Final Step Indicator */}
                {hop.is_final && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-green-900 dark:text-green-100 mb-1 uppercase tracking-wide">Final Step</h4>
                        <p className="text-sm text-green-800 dark:text-green-200">
                            This will complete your mission and deliver the final results.
                        </p>
                    </div>
                )}

                {/* Input Assets */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Inputs</h4>
                    {inputAssets.length > 0 ? (
                        <ul className="space-y-2">
                            {inputAssets.map(({ asset, localKey }) => (
                                <li key={localKey} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                    <div className="font-medium">{asset?.name || localKey}</div>
                                    {asset?.schema_definition?.type && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {asset.schema_definition.type}
                                        </div>
                                    )}
                                    {asset?.description && (
                                        <div className="text-xs mt-1 opacity-80">
                                            {asset.description}
                                        </div>
                                    )}
                                    {asset?.agent_specification && (
                                        <div className="text-xs mt-1 opacity-60 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-600 dark:text-gray-400">
                                            <div className="font-semibold mb-1">Technical Spec:</div>
                                            {asset.agent_specification}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No input assets required</p>
                    )}
                </div>

                {/* Output Assets */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                        {hop.is_final ? 'Final Outputs' : 'Outputs'}
                    </h4>
                    {outputAssets.length > 0 ? (
                        <ul className="space-y-2">
                            {outputAssets.map(({ asset, localKey }) => (
                                <li key={localKey} className={`text-sm rounded-lg px-3 py-2 ${hop.is_final
                                    ? 'text-green-800 dark:text-green-200 bg-green-50 dark:bg-green-900/20'
                                    : 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{asset?.name || localKey}</div>
                                            {asset?.schema_definition?.type && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {asset.schema_definition.type}
                                                </div>
                                            )}
                                            {asset?.description && (
                                                <div className="text-xs mt-1 opacity-80">
                                                    {asset.description}
                                                </div>
                                            )}
                                            {asset?.agent_specification && (
                                                <div className="text-xs mt-1 opacity-60 font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-600 dark:text-gray-400">
                                                    <div className="font-semibold mb-1">Technical Spec:</div>
                                                    {asset.agent_specification}
                                                </div>
                                            )}
                                        </div>
                                        {hop.is_final && (
                                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full font-medium">
                                                Final
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No output assets defined</p>
                    )}
                </div>

                {/* Overview */}
                {hop.rationale && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Overview</h4>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {hop.rationale}
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {needsAcceptance && (
                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onReject}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                        </button>
                        <button
                            onClick={() => onAccept(hop, proposedAssets)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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