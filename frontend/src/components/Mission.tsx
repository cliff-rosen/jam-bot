import React, { useState } from 'react';
import { useJamBot } from '@/context/JamBotContext';
import { MissionStateTable } from './common/MissionStateTable';
import { CurrentHopDetails } from './common/CurrentHopDetails';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { HopStatus, MissionStatus } from '@/types/workflow';

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
        mission_status: 'pending',
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

    console.log('Mission component state:', state);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete':
                return 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
            case 'active':
                return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
            case 'failed':
                return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
            case 'ready':
                return 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20';
            case 'pending':
                return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
            default:
                return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'complete':
                return 'COMPLETED';
            case 'active':
                return 'ACTIVE';
            case 'failed':
                return 'FAILED';
            case 'ready':
                return 'READY';
            case 'pending':
                return 'PENDING';
            default:
                return 'PENDING';
        }
    };

    const getHopStatusColor = (status?: HopStatus) => {
        if (!status) return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        switch (status) {
            case HopStatus.READY_TO_DESIGN:
                return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
            case HopStatus.HOP_PROPOSED:
                return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
            case HopStatus.HOP_READY_TO_RESOLVE:
                return 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
            case HopStatus.HOP_READY_TO_EXECUTE:
                return 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20';
            case HopStatus.HOP_RUNNING:
                return 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
            case HopStatus.ALL_HOPS_COMPLETE:
                return 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30';
            default:
                return 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
        }
    };

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
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(mission.mission_status)}`}>
                            {getStatusText(mission.mission_status)}
                        </span>
                        {mission.hop_status && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getHopStatusColor(mission.hop_status)}`}>
                                {mission.hop_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                        )}
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
                                    <li key={hop.id || idx} className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#23283a] rounded px-2 py-1">
                                        {hop.name || `Hop ${idx + 1}`} ({hop.status})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-xs text-gray-400 italic">No hops defined</div>
                        )}
                    </div>
                    {mission.current_hop && (
                        <CurrentHopDetails
                            hop={mission.current_hop}
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