import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useJamBot } from '@/context/JamBotContext';
import { getMissionStatusDisplay, getHopStatusDisplay } from '@/utils/statusUtils';

const SessionStatus: React.FC = () => {
    const { sessionName } = useAuth();
    const { state, createNewSession } = useJamBot();

    const handleNewSession = async () => {
        try {
            await createNewSession();
        } catch (error) {
            console.error('Failed to create new session:', error);
        }
    };

    const missionStatusDisplay = state.mission ? getMissionStatusDisplay(state.mission.status) : null;
    const hopStatusDisplay = state.mission?.current_hop ? getHopStatusDisplay(state.mission.current_hop.status) : null;

    return (
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {sessionName || 'No Session'}
                    </span>

                    {missionStatusDisplay && (
                        <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${missionStatusDisplay.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                                missionStatusDisplay.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                    missionStatusDisplay.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                                        missionStatusDisplay.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400'
                            }`}>
                            {missionStatusDisplay.icon}
                            Mission: {missionStatusDisplay.text}
                        </div>
                    )}

                    {hopStatusDisplay && (
                        <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${hopStatusDisplay.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400' :
                                hopStatusDisplay.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400' :
                                    hopStatusDisplay.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' :
                                        hopStatusDisplay.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400'
                            }`}>
                            {hopStatusDisplay.icon}
                            Hop: {hopStatusDisplay.text}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleNewSession}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-300 dark:border-gray-600"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Session</span>
                </button>
            </div>
        </div>
    );
};

export default SessionStatus; 