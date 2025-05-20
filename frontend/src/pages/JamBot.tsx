import React, { useState } from 'react';
import Chat from '@/components/Chat';
import CollabArea from '@/components/CollabArea';
import { useJamBot } from '@/context/JamBotContext';
import AssetPanels from '@/components/hop/AssetPanels';
import { AssetType } from '@/types/asset';

const JamBotPage: React.FC = () => {
    const { state, sendMessage } = useJamBot();
    const { currentMessages, currentStreamingMessage, collabArea } = state;

    // Mock assets for now - replace with actual assets from your state/context
    const mockAssets = [
        {
            id: '1',
            name: 'Sample File',
            description: 'A sample file asset',
            type: AssetType.FILE,
            subtype: 'pdf',
            is_collection: false,
            content: 'Sample content',
            asset_metadata: {
                createdAt: new Date().toISOString(),
                tags: ['sample', 'test']
            }
        }
    ];

    return (
        <div className="flex bg-gray-50 dark:bg-gray-900 h-[calc(100vh-64px)] mt-[64px]">
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
            <div className="flex-1 h-full min-w-[500px]">
                <AssetPanels assets={mockAssets} />
            </div>
        </div>
    );
};

export default JamBotPage; 