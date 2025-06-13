import React, { useState } from 'react';
import { useJamBot } from '@/context/JamBotContext';
import { MissionStateTable } from '@/components/common/MissionStateTable';
import { CurrentHopDetails } from './common/CurrentHopDetails';
import { FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { MissionStatus, Hop, Mission as MissionType, ExecutionStatus, HopStatus, defaultMission } from '@/types/workflow';
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
                {/* @ts-ignore legacy field */}
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {(asset as any).type}
                </span>
                {/* @ts-ignore legacy field */}
                {(asset as any).subtype && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        {(asset as any).subtype}
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
        setCollabArea,
        updateHopState
    } = useJamBot();
    const [isExpanded, setIsExpanded] = useState(false);

    const mission = state.mission || defaultMission;

    const handleHopUpdate = (updatedHop: Hop, updatedMissionOutputs: Map<string, Asset>) => {
        updateHopState(updatedHop, updatedMissionOutputs);
    };

    const hasPendingProposal = state.collabArea.type === 'mission-proposal' && mission.mission_status === MissionStatus.PENDING;
    const hasPendingHopProposal = state.collabArea.type === 'hop-proposal' &&
        mission.current_hop?.status === HopStatus.HOP_PROPOSED;
    const hasPendingHopImplementationProposal = state.collabArea.type === 'hop-implementation-proposal' &&
        mission.current_hop?.status === HopStatus.HOP_READY_TO_RESOLVE;

    // Get status displays using centralized utilities
    const missionStatusDisplay = getMissionStatusDisplay(mission.mission_status);
    const currentHopStatusDisplay = mission.current_hop ? getHopStatusDisplay(mission.current_hop.status) : null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Mission Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {mission.name || 'New Mission'}
                    </h2>
                </div>
                <span className={getStatusBadgeClass(missionStatusDisplay.color)}>
                    {missionStatusDisplay.icon}
                    {missionStatusDisplay.text}
                </span>
            </div>

            {/* Mission Description */}
            {mission.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {mission.description}
                </p>
            )}

            {/* Mission State */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Mission State</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {isExpanded && (
                    <div className="px-4 pb-4">
                        <MissionStateTable
                            missionState={mission.mission_state}
                            className="mt-2"
                        />
                    </div>
                )}
            </div>

            {/* Current Hop */}
            {mission.current_hop && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <CurrentHopDetails
                        hop={mission.current_hop}
                        className="p-4"
                        onHopUpdate={handleHopUpdate}
                    />
                </div>
            )}

            {/* Hop History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Hop History</h3>
                </div>
                <div className="p-4">
                    {mission.hop_history.length > 0 ? (
                        <div className="space-y-2">
                            {mission.hop_history.map((hop, idx) => (
                                <button
                                    key={hop.id}
                                    className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
                                    onClick={() => setCollabArea('hop', hop)}
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
                                        <span className={getStatusBadgeClass(getHopStatusDisplay(hop.status).color)}>
                                            {getHopStatusDisplay(hop.status).text}
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
            </div>
        </div>
    );
} 