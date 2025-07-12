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
    const { state } = useJamBot();
    const mission: MissionType = state.mission || defaultMission;
    const missionStatusDisplay = getMissionStatusDisplay(mission.status);
    const [expanded, setExpanded] = useState(false);

    // Don't render anything if mission is pending
    if (mission.status === MissionStatus.AWAITING_APPROVAL) {
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
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Current Hop</h4>
                            {mission.current_hop ? (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
                                    <div>
                                        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            {mission.current_hop.name || 'Current Hop'}
                                        </div>
                                        {mission.current_hop.description && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {mission.current_hop.description}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(getHopStatusDisplay(mission.current_hop.status).color)}`}>
                                        {getHopStatusDisplay(mission.current_hop.status).text}
                                    </span>
                                </div>
                            ) : (
                                <div className="text-gray-500 italic">No current hop</div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Hop History</h4>
                            {mission.hops.length > 0 ? (
                                <div className="space-y-2">
                                    {mission.hops.map((hop: any, idx: number) => (
                                        <div
                                            key={hop.id}
                                            className="w-full text-left bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center gap-6"
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
                                            <span className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(getHopStatusDisplay(hop.status).color)}`}>
                                                {getHopStatusDisplay(hop.status).text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 italic">No hops defined</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}; 