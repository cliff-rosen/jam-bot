import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatMessage as ChatMessageType } from './types';

interface ChatPanelProps {
  article: CanonicalResearchArticle;
  onSendMessage?: (message: string, article: CanonicalResearchArticle, conversationHistory: Array<{role: string; content: string}>) => Promise<string>;
}

export function ChatPanel({ article, onSendMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm here to help you analyze this article: "${article.title}". You can ask me questions about the methodology, findings, implications, or anything else related to this research.`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let assistantResponse: string;
      
      if (onSendMessage) {
        // Build conversation history from current messages (excluding the initial greeting)
        const conversationHistory = messages
          .slice(1) // Skip the initial greeting
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        
        assistantResponse = await onSendMessage(messageContent, article, conversationHistory);
      } else {
        // Fallback simulation for development
        await new Promise(resolve => setTimeout(resolve, 1000));
        assistantResponse = `I understand you're asking about "${messageContent}". Based on the article "${article.title}", I can help analyze specific aspects. Could you be more specific about what you'd like to know about this research?`;
      }

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Article Chat</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Ask questions about this research
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t dark:border-gray-700">
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Questions</h4>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What is the main research question?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Research Question
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What methodology was used?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Methodology
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What are the key findings?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Key Findings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("What are the limitations?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Limitations
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t dark:border-gray-700">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about this article..."
        />
      </div>
    </div>
  );
}