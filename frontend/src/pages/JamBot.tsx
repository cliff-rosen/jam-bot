import React, { useState } from 'react';
import Chat from '@/components/Chat';
import CollabArea from '@/components/CollabArea';
import { useJamBot } from '@/context/JamBotContext';
import AssetPanels from '@/components/hop/AssetPanels';
import StateInspector from '@/components/StateInspector';
import { Database } from 'lucide-react';

const JamBotPage: React.FC = () => {
    const { state, sendMessage } = useJamBot();
    const { currentMessages, currentStreamingMessage, collabArea, mission } = state;
    const [isStateInspectorOpen, setIsStateInspectorOpen] = useState(false);

    return (
        <div className="relative flex bg-gray-50 dark:bg-gray-900 h-[calc(100vh-64px)] mt-[64px]">
            {/* State Inspector Button */}
            <div className="absolute top-2 right-2 z-10">
                <button
                    onClick={() => setIsStateInspectorOpen(true)}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Inspect JamBot State"
                >
                    <Database className="w-5 h-5" />
                </button>
            </div>

            <StateInspector
                isOpen={isStateInspectorOpen}
                onClose={() => setIsStateInspectorOpen(false)}
            />

            {/* Chat Area - Fixed width */}
            <div className="w-[400px] h-full flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
                <Chat
                    messages={currentMessages}
                    streamingMessage={currentStreamingMessage}
                    onNewMessage={sendMessage}
                />
            </div>

            {/* Collab Area - Fixed width */}
            <div className="w-[600px] h-full flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
                <CollabArea
                    type={collabArea.type}
                    content={collabArea.content}
                />
            </div>

            {/* Asset Panels - Flexible width */}
            <div className="flex-1 h-full min-w-[500px] bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <div className="h-full mx-4 my-2 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                    <AssetPanels />
                </div>
            </div>
        </div>
    );
};

export default JamBotPage; 