import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CanonicalResearchArticle } from '@/types/canonical_types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatMessage as ChatMessageType } from './types';
import { useWorkbench } from '@/context/WorkbenchContext';
import { useToast } from '@/components/ui/use-toast';

interface ChatPanelProps {
  article: CanonicalResearchArticle;
  onSendMessage?: (
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>;
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
  const { updateArticleNotes, groupCollection } = useWorkbench();
  const { toast } = useToast();

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

    // Create a placeholder assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      if (onSendMessage) {
        // Build conversation history from current messages (excluding the initial greeting and current messages)
        const conversationHistory = messages
          .slice(1) // Skip the initial greeting
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));

        await onSendMessage(
          messageContent,
          article,
          conversationHistory,
          // onChunk - append to the assistant message
          (chunk: string) => {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          },
          // onComplete
          () => {
            setIsLoading(false);
          },
          // onError
          (error: string) => {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: `I apologize, but I encountered an error: ${error}. Please try again.` }
                : msg
            ));
            setIsLoading(false);
          }
        );
      } else {
        // Fallback simulation for development
        await new Promise(resolve => setTimeout(resolve, 1000));
        const fallbackResponse = `I understand you're asking about "${messageContent}". Based on the article "${article.title}", I can help analyze specific aspects. Could you be more specific about what you'd like to know about this research?`;

        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: fallbackResponse }
            : msg
        ));
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'I apologize, but I encountered an error while processing your message. Please try again.' }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleQuickAction = (question: string) => {
    handleSendMessage(question);
  };

  const handleAddToNotes = async (content: string) => {
    if (!groupCollection?.saved_group_id) {
      toast({
        title: 'Cannot Add to Notes',
        description: 'This collection must be saved first to add notes.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get current notes for this article
      const currentArticle = groupCollection.articles.find(
        item => item.article.id === article.id
      );
      const currentNotes = currentArticle?.notes || '';

      // Create delimiter and timestamp
      const timestamp = new Date().toLocaleString();
      const delimiter = '\n\n--- Chat Response Added ---\n';
      const timestampLine = `Added on ${timestamp}:\n\n`;
      
      // Append new content
      const newNotes = currentNotes 
        ? currentNotes + delimiter + timestampLine + content
        : timestampLine + content;

      await updateArticleNotes(article.id, newNotes, 'group');

      toast({
        title: 'Added to Notes',
        description: 'Chat response has been added to your article notes.',
      });
    } catch (error) {
      console.error('Error adding to notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to add response to notes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
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
            <ChatMessage key={message.id} message={message} onAddToNotes={handleAddToNotes} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
              onClick={() => handleQuickAction("How is this research relevant to Palatin's interests and business focus?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Palatin Relevance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Can you explain this article in simple, layman's terms that anyone can understand?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Simple Explanation
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
              onClick={() => handleQuickAction("What competitive threats or opportunities does this present?")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Business Impact
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Explain abstract in this format:\n- Background / Rationale: Why this study was done.\n- Objective: What the study aimed to find out.\n- Methods: How it was done (what kind of study, what measurements).\n- Results: What was found (often with numbers or statistics).\n- Conclusion / Interpretation: What it means, and how it matters.")}
              className="text-xs h-7"
              disabled={isLoading}
            >
              Explain Abstract
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