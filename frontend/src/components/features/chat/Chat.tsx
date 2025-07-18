import { useState, useEffect, useRef } from 'react';
import { MessageRole } from '@/types/chat';
import { useJamBot } from '@/context/JamBotContext';
import { ChatHeader } from './ChatHeader';
import { ChatMessageItem } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatLoadingIndicator } from './ChatLoadingIndicator';

export default function Chat() {
    const { state, sendMessage, createMessage } = useJamBot();
    const { currentMessages, currentStreamingMessage, isProcessing } = state;

    const [input, setInput] = useState('');
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
        if (!input.trim() || isProcessing) return;
        setInput('');

        const userMessage = createMessage(input, MessageRole.USER);

        await sendMessage(userMessage);
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
                        onCollabClick={() => { }}
                    />
                ))}

                {isProcessing && <ChatLoadingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput
                input={input}
                setInput={setInput}
                onSendMessage={handleSendMessage}
                isLoading={isProcessing}
            />
        </div>
    );
} 