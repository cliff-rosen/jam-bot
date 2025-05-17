import React from 'react';
import { Journey, ChatMessage } from './types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface ChatPanelProps {
    journey: Journey | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ journey }) => {
    if (!journey) {
        return <div className="text-gray-500 dark:text-gray-400">No journey selected</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {journey.messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                }`}
                        >
                            <div className="prose dark:prose-invert prose-sm max-w-none">
                                <MarkdownRenderer content={message.content} />
                            </div>
                            {message.metadata?.actionButtons && (
                                <div className="flex gap-2 mt-2">
                                    {message.metadata.actionButtons.map((button) => (
                                        <button
                                            key={button.id}
                                            className={`px-3 py-1 rounded text-xs font-medium ${button.type === 'primary'
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : button.type === 'danger'
                                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {button.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 