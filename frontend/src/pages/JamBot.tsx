import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Chat from '@/components/Chat';
import { useJamBot } from '@/context/JamBotContext';

const JamBotPage: React.FC = () => {
    const [isChatCollapsed, setIsChatCollapsed] = useState(true);
    const [isRightColumnCollapsed, setIsRightColumnCollapsed] = useState(false);

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
                    {/* Main Content Area */}
                    <div key="main-content" className={`h-full flex flex-col flex-1 ${isRightColumnCollapsed ? 'w-full' : ''}`}>
                        <div className="flex flex-col items-center">
                            {/* Mission Header */}
                            <div className="pt-2 pb-2 w-full">
                                Hello
                            </div>
                        </div>
                    </div>

                    {/* Right Rail */}
                    <div
                        key="right-rail"
                        className={`h-full overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${isRightColumnCollapsed ? 'w-0' : 'w-[300px] flex-shrink-0'}`}
                    >
                        <div className="h-1/2 overflow-y-auto">
                            Tools
                        </div>

                        {/* Collapse Button */}
                        <button
                            onClick={() => setIsRightColumnCollapsed(!isRightColumnCollapsed)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-gray-100 dark:bg-gray-800 rounded-l-lg shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            {isRightColumnCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default JamBotPage; 