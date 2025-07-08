import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';
import { Mission as MissionType, defaultMission, MissionStatus } from '@/types/workflow';
import { getMissionStatusDisplay, getHopStatusDisplay, getStatusBadgeClass } from '@/utils/statusUtils';

interface MissionProps {
    className?: string;
}

export const Mission: React.FC<MissionProps> = ({ className = '' }) => {
    const { state, setCollabArea } = useJamBot();
    const mission: MissionType = state.mission || defaultMission;
    const missionStatusDisplay = getMissionStatusDisplay(mission.mission_status);
    const [expanded, setExpanded] = useState(false);

    // Don't render anything if mission is pending
    if (mission.mission_status === MissionStatus.PROPOSED) {
        return null;
    }

    return (
        <Card className={`w-full max-w-2xl mx-auto my-6 shadow-lg ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-card/80 rounded-t-lg cursor-pointer" onClick={() => setExpanded((v) => !v)}>
                <div>
                    <CardTitle className="mb-1 text-gray-900 dark:text-gray-100">{mission.name || 'New Mission'}</CardTitle>
                    {mission.description && (
                        <p className="text-base text-gray-600 dark:text-gray-400">{mission.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center px-4 py-1.5 rounded-full text-base font-semibold ${getStatusBadgeClass(missionStatusDisplay.color)}`}>{missionStatusDisplay.text}</span>
                    {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-6">
                    {mission.goal && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Goal</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{mission.goal}</p>
                        </div>
                    )}
                    {mission.success_criteria && mission.success_criteria.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Success Criteria</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {mission.success_criteria.map((criteria: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200">{criteria}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Hop History</h4>
                        {mission.hop_history.length > 0 ? (
                            <div className="space-y-2">
                                {mission.hop_history.map((hop, idx) => (
                                    <button
                                        key={hop.id}
                                        className="w-full text-left bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center gap-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none shadow-sm"
                                        onClick={() => setCollabArea('current-hop', hop)}
                                    >
                                        <div>
                                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                                {hop.name || `Hop ${idx + 1}`}
                                            </div>
                                            {hop.description && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {hop.description}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(getHopStatusDisplay(hop.status).color)}`}>{getHopStatusDisplay(hop.status).text}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">No hops defined</div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}; 