import React, { useEffect, useState } from 'react';
import Chat from '@/components/Chat';
import CollabArea from '@/components/CollabArea';
import { useJamBot } from '@/context/JamBotContext';
import AssetPanels from '@/components/hop/AssetPanels';
import { Asset, AssetType } from '@/types/asset';
import { assetApi } from '@/lib/api/assetApi';

const JamBotPage: React.FC = () => {
    const { state, sendMessage } = useJamBot();
    const { currentMessages, currentStreamingMessage, collabArea } = state;

    const [assets, setAssets] = useState<Asset[]>([]);

    useEffect(() => {
        const fetchAssets = async () => {
            const fetchedAssets = await assetApi.getAssets();
            setAssets(fetchedAssets);
        };
        fetchAssets();
    }, []);

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
            <div className="flex-1 h-full min-w-[500px] bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <div className="h-full mx-4 my-2 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
                    <AssetPanels assets={assets} />
                </div>
            </div>
        </div>
    );
};

export default JamBotPage; 