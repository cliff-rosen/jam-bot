import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, MessageReaction, Asset, Tool } from './types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface ActionButton {
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    onClick: () => void;
}

interface EnhancedChatPanelProps {
    messages: ChatMessage[];
    inputMessage: string;
    isProcessing: boolean;
    onSendMessage: (message: string) => void;
    actionButtons?: ActionButton[];
    className?: string;
}

export const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({
    messages,
    inputMessage,
    isProcessing,
    onSendMessage,
    actionButtons = [],
    className = ''
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [localInput, setLocalInput] = useState(inputMessage);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Update local input when prop changes
    useEffect(() => {
        setLocalInput(inputMessage);
    }, [inputMessage]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setLocalInput(value);

    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localInput.trim() && !isProcessing) {
            onSendMessage(localInput);
            setLocalInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const renderMessage = (message: ChatMessage, isThread = false) => {
        const isUser = message.role === 'user';

        return (
            <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
            >
                <div
                    className={`relative max-w-[80%] rounded-lg p-4 ${isUser
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                >
                    {/* Message Content */}
                    <div className="prose dark:prose-invert max-w-none">
                        <MarkdownRenderer content={message.content} />
                    </div>

                    {message.metadata?.type && (
                        <span className="text-xs opacity-75 mt-1 block">
                            {message.metadata.type}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                    <div key={message.id}>
                        {renderMessage(message)}
                        {selectedMessageId === message.id && message.thread && (
                            <div className="ml-8 mt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                                {message.thread.map(threadMessage => renderMessage(threadMessage, true))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Action Buttons */}
            {actionButtons.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        {actionButtons.map((button) => (
                            <button
                                key={button.id}
                                onClick={button.onClick}
                                className={`px-3 py-1.5 text-sm rounded ${button.type === 'primary'
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : button.type === 'danger'
                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={localInput}
                        onChange={(e) => setLocalInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message... Use @ to mention assets or tools"
                        className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        disabled={isProcessing}
                    />
                    <button
                        type="submit"
                        disabled={isProcessing || !localInput.trim()}
                        className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}; 