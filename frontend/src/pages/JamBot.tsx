import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Chat from '@/components/Chat';
import { useJamBot } from '@/context/JamBotContext';

const JamBotPage: React.FC = () => {
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

    const { state, addMessage, updateStreamingMessage, sendMessage } = useJamBot();

    const { currentMessages, currentStreamingMessage } = state;

    return (
        <div className="h-screen flex flex-col">
            <div className="flex-1 min-h-0">
                <div className="flex h-full gap-4 px-4">
                    {/* Left Chat Rail */}
                    <div
                        className={`relative transition-all duration-300 ease-in-out ${isChatCollapsed ? 'w-0' : 'w-[400px]'}
                      } h-full flex-shrink-0`}
                    >
                        <button
                            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                            className="absolute -right-3 top-4 z-10 p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            {isChatCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronLeft className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                        <div className={`h-full transition-opacity duration-300 ${isChatCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                            <Chat
                                messages={currentMessages}
                                streamingMessage={currentStreamingMessage}
                                onNewMessage={sendMessage}
                            />
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="h-full flex flex-col flex-1">
                        <div className="flex flex-col items-center">
                            {/* Mission Header */}
                            <div className="pt-2 pb-2 w-full">
                                Hello
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JamBotPage; 