import React from 'react';
import { Chat } from '@/components/features/chat';
import { CollabArea } from '@/components/features/collab';
import { useJamBot } from '@/context/JamBotContext';

const JamBot: React.FC = () => {
    const { state } = useJamBot();

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Left Side - Chat */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                <Chat />
            </div>

            {/* Right Side - Collab Area */}
            <div className="w-1/2 flex flex-col">
                <CollabArea />
            </div>
        </div>
    );
};

export default JamBot; 