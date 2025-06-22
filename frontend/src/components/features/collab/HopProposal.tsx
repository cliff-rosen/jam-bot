import React from 'react';
import { CheckCircle, XCircle, X, Target, Package, AlertTriangle, ArrowRight, FileText, Star } from 'lucide-react';
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
        <div className="h-full overflow-auto bg-white dark:bg-gray-900">
            {/* Clean Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-8 py-6">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Hop Proposal
                            </span>
                            {isAlreadyAccepted && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Accepted
                                </span>
                            )}
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
                {/* Final Step Indicator */}
                {hop.is_final && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                                    <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Final Step
                                </h3>
                                <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                                    This will complete your mission and deliver the final results.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input Assets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Input Assets
                        </h2>
                    </div>

                    {inputAssets.length > 0 ? (
                        <div className="grid gap-3">
                            {inputAssets.map(({ asset, localKey }, index) => (
                                <div key={localKey} className="group bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-4 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white mb-1">
                                                    {asset?.name || localKey}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {asset?.schema_definition?.type}
                                                    {asset?.is_collection && ` • ${asset?.collection_type}`}
                                                </div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    From asset library
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Available
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                                No input assets required for this step
                            </div>
                        </div>
                    )}
                </div>

                {/* Output Assets */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Output Assets
                        </h2>
                    </div>

                    {outputAssets.length > 0 ? (
                        <div className="grid gap-3">
                            {outputAssets.map(({ asset, localKey }, index) => (
                                <div key={localKey} className={`group rounded-xl p-4 transition-all duration-200 border ${hop.is_final
                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600'
                                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-medium ${hop.is_final
                                                ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                                                }`}>
                                                {hop.is_final ? <Star className="w-4 h-4" /> : index + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {asset?.name || localKey}
                                                    </div>
                                                    {hop.is_final && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                                                            Mission Output
                                                        </span>
                                                    )}
                                                    {!hop.is_final && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                                            Work in Progress
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {asset?.schema_definition?.type}
                                                    {asset?.is_collection && ` • ${asset?.collection_type}`}
                                                </div>
                                                {asset?.description && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                        {asset.description}
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {hop.is_final ? 'To mission outputs' : 'To asset library'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm font-medium ${hop.is_final
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-blue-600 dark:text-blue-400'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${hop.is_final ? 'bg-emerald-500' : 'bg-blue-500'
                                                }`}></div>
                                            {hop.is_final ? 'Final Result' : 'New Asset'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                                No output assets defined for this step
                            </div>
                        </div>
                    )}
                </div>

                {/* Mission Details */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {hop.is_final ? 'Will Produce Final Results' : 'Next Step'}
                        </h2>
                    </div>

                    {hop.rationale && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                {hop.rationale}
                            </p>
                        </div>
                    )}

                    {!hop.is_final && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                                        Work in Progress
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                        This step will create work-in-progress assets. Additional operations will follow to complete your mission.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {needsAcceptance && (
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
                                onClick={() => onAccept(hop, proposedAssets)}
                                className="px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Accept
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Hop proposal generated at {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
}; 