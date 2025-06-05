import React, { useState } from 'react';
import { useJamBot } from '@/context/JamBotContext';
import { MissionStateTable } from './common/MissionStateTable';
import { CurrentHopDetails } from './common/CurrentHopDetails';
import { FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { HopStatus, MissionStatus } from '@/types/workflow';
import { getMissionStatusDisplay, getHopStatusDisplay, getExecutionStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';
import { Asset } from '@/types/asset';

interface MissionProps {
    className?: string;
}

interface AssetDisplayProps {
    asset: Asset;
}

const AssetDisplay: React.FC<AssetDisplayProps> = ({ asset }) => {
    return (
        <div className="text-xs bg-gray-50 dark:bg-[#23283a] rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-gray-100">{asset.name}</span>
                <span className="text-gray-500 dark:text-gray-400 font-mono">{asset.id?.slice(-8)}</span>
            </div>
            {asset.description && (
                <div className="text-gray-600 dark:text-gray-300">{asset.description}</div>
            )}
            <div className="flex flex-wrap gap-1 text-xs">
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {asset.type}
                </span>
                {asset.subtype && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        {asset.subtype}
                    </span>
                )}
                {asset.is_collection && (
                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {asset.collection_type || 'collection'}
                    </span>
                )}
            </div>
        </div>
    );
};

export default function Mission({
    className = ''
}: MissionProps) {
    const {
        state,
        setCollabArea
    } = useJamBot();
    const [isExpanded, setIsExpanded] = useState(false);

    const mission = state.mission || {
        name: '',
        description: '',
        mission_status: MissionStatus.PENDING,
        inputs: [],
        outputs: [],
        goal: '',
        success_criteria: [],
        id: '',
        created_at: '',
        updated_at: '',
        current_hop_index: 0,
        hop_status: undefined,
        hops: [],
        current_hop: undefined,
        metadata: {},
        state: {}
    };

    const hasPendingProposal = state.collabArea.type === 'mission-proposal' && mission.mission_status === MissionStatus.PENDING;
    const hasPendingHopProposal = state.collabArea.type === 'hop-proposal' && mission.hop_status === HopStatus.HOP_PROPOSED;
    const hasPendingHopImplementationProposal = state.collabArea.type === 'hop-implementation-proposal' && mission.hop_status === HopStatus.HOP_READY_TO_RESOLVE;

    // Get status displays using centralized utilities
    const missionStatusDisplay = getMissionStatusDisplay(mission.mission_status);
    const hopStatusDisplay = mission.hop_status ? getHopStatusDisplay(mission.hop_status) : null;

    return (
        <div className={`dark:bg-[#1e2330] ${className}`}>
            {/* Section Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mission</h2>
                <div className="flex items-center gap-2">
                    {/* Action Buttons */}
                    {hasPendingProposal && (
                        <button
                            onClick={() => setCollabArea('mission-proposal', state.collabArea.content)}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        >
                            <FileText className="w-3 h-3" />
                            Proposal
                        </button>
                    )}
                    {hasPendingHopProposal && (
                        <button
                            onClick={() => setCollabArea('hop-proposal', state.collabArea.content)}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                        >
                            <FileText className="w-3 h-3" />
                            Hop
                        </button>
                    )}
                    {hasPendingHopImplementationProposal && (
                        <button
                            onClick={() => setCollabArea('hop-implementation-proposal', state.collabArea.content)}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors"
                        >
                            <FileText className="w-3 h-3" />
                            Implementation
                        </button>
                    )}

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Compact Mission View */}
            <div className="px-4 pt-3 pb-4 space-y-2">
                {/* First Line: Mission Name and Status */}
                <div className="flex items-center justify-between">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {mission.name || 'No Mission Selected'}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className={getStatusBadgeClass(missionStatusDisplay.color)}>
                            {missionStatusDisplay.text}
                        </span>
                        {mission.mission_status === MissionStatus.ACTIVE && hopStatusDisplay && (
                            <span className={getStatusBadgeClass(hopStatusDisplay.color)}>
                                {hopStatusDisplay.text}
                            </span>
                        )}
                    </div>
                </div>

                {/* Second Line: Mission Description */}
                {mission.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        {mission.description}
                    </div>
                )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                    {/* Inputs and Outputs */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Inputs Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">
                                Inputs ({mission.inputs?.length || 0})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {mission.inputs && mission.inputs.length > 0 ? (
                                    mission.inputs.map((input, idx) => (
                                        <AssetDisplay key={input.id || idx} asset={input} />
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400 italic bg-gray-50 dark:bg-[#23283a] rounded p-3">
                                        No inputs defined
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Outputs Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">
                                Outputs ({mission.outputs?.length || 0})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {mission.outputs && mission.outputs.length > 0 ? (
                                    mission.outputs.map((output, idx) => (
                                        <AssetDisplay key={output.id || idx} asset={output} />
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-400 italic bg-gray-50 dark:bg-[#23283a] rounded p-3">
                                        No outputs defined
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Goal and Success Criteria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Goal</h3>
                            <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded p-3">
                                {mission.goal || 'Not set'}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Success Criteria</h3>
                            <div className="bg-gray-50 dark:bg-[#23283a] rounded p-3">
                                {mission.success_criteria && mission.success_criteria.length > 0 ? (
                                    <ul className="space-y-1">
                                        {mission.success_criteria.map((criterion, idx) => (
                                            <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 flex items-start">
                                                <span className="text-gray-400 mr-2">•</span>
                                                {criterion}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-sm text-gray-400 italic">No success criteria defined</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hops */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">
                            Hops ({mission.hops?.length || 0})
                        </h3>
                        {mission.hops && mission.hops.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {mission.hops.map((hop, idx) => (
                                    <button
                                        key={hop.id || idx}
                                        onClick={() => setCollabArea('hop', hop)}
                                        className="w-full text-left p-3 bg-gray-50 dark:bg-[#23283a] hover:bg-gray-100 dark:hover:bg-[#2a3044] rounded transition-colors group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {hop.name || `Hop ${idx + 1}`}
                                                    </div>
                                                    {hop.description && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            {hop.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={getStatusBadgeClass(getExecutionStatusDisplay(hop.status).color)}>
                                                {getExecutionStatusDisplay(hop.status).text}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 italic bg-gray-50 dark:bg-[#23283a] rounded p-3">
                                No hops defined
                            </div>
                        )}
                    </div>

                    {/* Current Hop Details */}
                    {(mission.current_hop || mission.hops[mission.current_hop_index - 1]) && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Current Hop</h3>
                            <CurrentHopDetails
                                hop={mission.current_hop || mission.hops[mission.current_hop_index - 1]}
                                className="bg-gray-50 dark:bg-[#23283a] rounded p-3"
                            />
                        </div>
                    )}

                    {/* Mission State */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Mission State</h3>
                        <MissionStateTable
                            state={mission.state || {}}
                            className="bg-gray-50 dark:bg-[#23283a] rounded p-3"
                        />
                    </div>

                    {/* Mission Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Mission Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">ID:</span>
                                    <span className="ml-2 font-mono text-xs text-gray-700 dark:text-gray-300">{mission.id}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                                        {mission.created_at ? new Date(mission.created_at).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Current Hop Index:</span>
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">{mission.current_hop_index}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                                        {mission.updated_at ? new Date(mission.updated_at).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    {Object.keys(mission.metadata || {}).length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-2">Metadata</h3>
                            <pre className="text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded p-3 max-h-40 overflow-auto">
                                {JSON.stringify(mission.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 