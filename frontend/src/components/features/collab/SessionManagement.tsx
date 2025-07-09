import React from 'react';
import { Plus, Calendar, User } from 'lucide-react';

import { useJamBot } from '@/context/JamBotContext';
import { useAuth } from '@/context/AuthContext';

export const SessionManagement: React.FC = () => {
    const { createNewSession } = useJamBot();

    const { 
        missionId, 
        sessionMetadata, 
        user
    } = useAuth();

    const formatSessionDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return new Date().toLocaleDateString();
        }
    };

    const getSessionDate = () => {
        if (sessionMetadata?.initialized_at) {
            return formatSessionDate(sessionMetadata.initialized_at);
        }
        if (sessionMetadata?.created_via === 'login') {
            return formatSessionDate(sessionMetadata.initialized_at || new Date().toISOString());
        }
        return formatSessionDate(new Date().toISOString());
    };

    return (
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user?.username}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Session: {getSessionDate()}
                        </span>
                    </div>
                    {missionId && (
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Mission Active
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