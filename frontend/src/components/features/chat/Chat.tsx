import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/chat';
import { MessageRole } from '@/types/chat';
import { useJamBot } from '@/context/JamBotContext';
import { ChatHeader } from './ChatHeader';
import { ChatMessageItem } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatLoadingIndicator } from './ChatLoadingIndicator';

export default function Chat() {
    const { state, sendMessage } = useJamBot();
    const { currentMessages, currentStreamingMessage } = state;

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showStatusMessages, setShowStatusMessages] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filter messages based on showStatusMessages state
    const filteredMessages = showStatusMessages
        ? currentMessages
        : currentMessages.filter(message => message.role !== MessageRole.STATUS);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages, currentStreamingMessage]);

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

        await sendMessage(userMessage);
        setIsLoading(false);
    };

    const hasPayload = (messageId: string) => {
        return state.payload_history.some(item => item[messageId]);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 shadow-sm">
            <ChatHeader
                showStatusMessages={showStatusMessages}
                onToggleStatusMessages={() => setShowStatusMessages(!showStatusMessages)}
            />

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredMessages.map((message) => (
                    <ChatMessageItem
                        key={message.id}
                        message={message}
                        onCollabClick={() => { }} // Removed functionality due to type incompatibility
                        hasPayload={hasPayload(message.id)}
                    />
                ))}

                {isLoading && <ChatLoadingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput
                input={input}
                setInput={setInput}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
            />
        </div>
    );
} 