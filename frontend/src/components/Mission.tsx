import React, { useState } from 'react';
import { useJamBot } from '@/context/JamBotContext';
import { MissionStateTable } from './common/MissionStateTable';
import { CurrentHopDetails } from './common/CurrentHopDetails';
import { FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { HopStatus, MissionStatus } from '@/types/workflow';
import { getMissionStatusDisplay, getHopStatusDisplay, getExecutionStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';

interface MissionProps {
    className?: string;
}

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
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center"
                >
                    {isExpanded ? 'Hide Details' : 'Show Details'}
                    {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
            </div>
            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4 px-4 pt-2 pb-4">
                {/* Left Column - Name and Description */}
                <div className="space-y-1">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {mission.name || 'No Mission Selected'}
                    </h1>
                    {mission.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {mission.description}
                        </p>
                    )}
                </div>

                {/* Right Column - Status, Inputs, Outputs */}
                <div className="space-y-1">
                    <div className="flex justify-end items-center gap-2">
                        {hasPendingProposal && (
                            <button
                                onClick={() => setCollabArea('mission-proposal', state.collabArea.content)}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            >
                                <FileText className="w-3 h-3" />
                                View Proposal
                            </button>
                        )}
                        {hasPendingHopProposal && (
                            <button
                                onClick={() => setCollabArea('hop-proposal', state.collabArea.content)}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                            >
                                <FileText className="w-3 h-3" />
                                View Hop Proposal
                            </button>
                        )}
                        {hasPendingHopImplementationProposal && (
                            <button
                                onClick={() => setCollabArea('hop-implementation-proposal', state.collabArea.content)}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-colors"
                            >
                                <FileText className="w-3 h-3" />
                                View Hop Implementation
                            </button>
                        )}

                        {/* Status Section - Simplified */}
                        <div className="flex items-center justify-end gap-2">
                            {/* Mission Status */}
                            <span className="text-xs text-gray-500">Mission:</span>
                            <span className={getStatusBadgeClass(missionStatusDisplay.color)}>
                                {missionStatusDisplay.text}
                            </span>

                            {/* Hop Status - only show if mission is active and hop status exists */}
                            {mission.mission_status === MissionStatus.ACTIVE && hopStatusDisplay && (
                                <>
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className="text-xs text-gray-500">Hop:</span>
                                    <span className={getStatusBadgeClass(hopStatusDisplay.color)}>
                                        {hopStatusDisplay.text}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Inputs</h3>
                        {mission.inputs && mission.inputs.length > 0 ? (
                            <ul className="space-y-1">
                                {mission.inputs.map((input, idx) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {typeof input === 'string' ? input : input.name || JSON.stringify(input)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No inputs</div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Outputs</h3>
                        {mission.outputs && mission.outputs.length > 0 ? (
                            <ul className="space-y-1">
                                {mission.outputs.map((output, idx) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {typeof output === 'string' ? output : output.name || JSON.stringify(output)}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No outputs</div>
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Goal</h3>
                        <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                            {mission.goal || 'Not set'}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Success Criteria</h3>
                        {mission.success_criteria && mission.success_criteria.length > 0 ? (
                            <ul className="space-y-1">
                                {mission.success_criteria.map((criterion, idx) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {criterion}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No success criteria</div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Hops ({mission.hops?.length || 0})</h3>
                        {mission.hops && mission.hops.length > 0 ? (
                            <ul className="space-y-1 max-h-32 overflow-y-auto">
                                {mission.hops.map((hop, idx) => (
                                    <li key={hop.id || idx}>
                                        <button
                                            onClick={() => setCollabArea('hop', hop)}
                                            className="w-full text-left text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] hover:bg-gray-100 dark:hover:bg-[#2a3044] rounded px-2 py-1 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                    <span>{hop.name || `Hop ${idx + 1}`}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusBadgeClass(getExecutionStatusDisplay(hop.status).color)}`}>
                                                    {getExecutionStatusDisplay(hop.status).text}
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No hops defined</div>
                        )}
                    </div>
                    {(mission.current_hop || mission.hops[mission.current_hop_index - 1]) && (
                        <CurrentHopDetails
                            hop={mission.current_hop || mission.hops[mission.current_hop_index - 1]}
                            className=""
                        />
                    )}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Mission State</h3>
                        <MissionStateTable
                            state={mission.state || {}}
                            className="bg-gray-50 dark:bg-[#23283a] rounded p-2"
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Metadata (JSON)</h3>
                        <pre className="text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded p-2 max-h-40 overflow-auto">
                            {JSON.stringify(mission.metadata || {}, null, 2)}
                        </pre>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Mission ID</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{mission.id}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Created At</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{new Date(mission.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Updated At</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{new Date(mission.updated_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500">Current Hop Index</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{mission.current_hop_index}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 