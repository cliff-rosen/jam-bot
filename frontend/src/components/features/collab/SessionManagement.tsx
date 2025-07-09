import React from 'react';
import { Plus, Calendar, MessageCircle, Clock, Target, Hash } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';
import { useAuth } from '@/context/AuthContext';

export const SessionManagement: React.FC = () => {
    const { createNewSession, state } = useJamBot();

    const {
        sessionName,
        missionId,
        sessionMetadata
    } = useAuth();

    const getSessionDuration = () => {
        if (sessionMetadata?.initialized_at) {
            const start = new Date(sessionMetadata.initialized_at);
            const now = new Date();
            const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));

            if (diffMinutes < 1) {
                return 'Just started';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} min`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                return `${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                const days = Math.floor(diffMinutes / 1440);
                return `${days} day${days > 1 ? 's' : ''}`;
            }
        }
        return 'Just started';
    };

    const getSessionDisplayName = (name: string | null) => {
        if (!name) return 'Unnamed Session';
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    };

    const getMessageCount = () => {
        return state.currentMessages?.length || 0;
    };

    const getMissionStatus = () => {
        if (state.mission) {
            return state.mission.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return null;
    };

    return (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getSessionDisplayName(sessionName)}
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getMessageCount()} messages
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getSessionDuration()}
                        </span>
                    </div>

                    {missionId && (
                        <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {getMissionStatus()}
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={createNewSession}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    New Session
                </button>
            </div>
        </div>
    );
}; 