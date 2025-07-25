import { ChatMessage as ChatMessageType } from './types';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}
      >
        {message.role === 'user' ? (
          // User messages: simple text rendering (they don't typically use markdown)
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          // Assistant messages: full markdown rendering
          <MarkdownRenderer
            content={message.content}
            compact={true}
            className="text-sm prose-invert"
          />
        )}
        <div className={`text-xs mt-1 opacity-70 ${
          message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}