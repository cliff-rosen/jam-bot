import React, { useState, useEffect, useRef } from 'react';
import { Send, ExternalLink } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { MessageRole } from '@/types/chat';
import { MarkdownRenderer } from './common/MarkdownRenderer';
import { useJamBot } from '@/context/JamBotContext';

interface ChatProps {
    messages: ChatMessage[];
    streamingMessage: string;
    onNewMessage: (message: Omit<ChatMessage, 'role'> & { role: Exclude<MessageRole, MessageRole.STATUS> }) => void;
}

export default function Chat({ messages, onNewMessage, streamingMessage }: ChatProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { state, setCollabArea } = useJamBot();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;
        setInput('');
        setIsLoading(true);

        const userMessage = {
            id: Date.now().toString(),
            role: MessageRole.USER as const,
            content: input,
            timestamp: new Date().toISOString()
        };

        await onNewMessage(userMessage);

        setIsLoading(false);
        // Use setTimeout to ensure focus happens after the DOM updates
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCollabClick = (messageId: string) => {
        const payload = state.payload_history.find(item => item[messageId]);
        if (payload) {
            setCollabArea('object', payload[messageId]);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex-shrink-0 px-4 py-3 border-b dark:border-gray-700">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chat</h2>
            </div>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.role === MessageRole.USER
                                ? 'bg-blue-500 text-white'
                                : message.role === MessageRole.SYSTEM
                                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500'
                                    : message.role === MessageRole.STATUS
                                        ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700/50'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                }`}
                        >
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownRenderer content={message.content} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                {message.metadata?.type && (
                                    <div className="text-xs opacity-75">
                                        {message.metadata.type}
                                    </div>
                                )}
                                {state.payload_history.some(item => item[message.id]) && (
                                    <button
                                        onClick={() => handleCollabClick(message.id)}
                                        className="text-xs opacity-75 hover:opacity-100 transition-opacity flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        View in Collab
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* {streamingMessage && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownRenderer content={streamingMessage} />
                            </div>
                            <div className="inline-block ml-2 w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                )} */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-t dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 p-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="p-2 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
} 