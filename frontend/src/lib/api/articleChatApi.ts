/**
 * Article Chat API Client
 * 
 * Provides stateless chat functionality for article discussions.
 * No persistence - conversation history is managed by the frontend.
 */

import { api } from './index';
import { CanonicalResearchArticle } from '@/types/unifiedSearch';

export interface ArticleChatRequest {
  message: string;
  article_context: {
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    journal: string;
    publication_year?: number;
    doi?: string;
    extracted_features: Record<string, any>;
    source: string;
  };
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface ArticleChatResponse {
  response: string;
  metadata: {
    article_id: string;
    model: string;
    token_usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}

class ArticleChatApi {
  /**
   * Send a message about an article and get a streaming response
   */
  async sendMessageStream(
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const request: ArticleChatRequest = {
        message,
        article_context: {
          id: article.id,
          title: article.title,
          authors: article.authors,
          abstract: article.abstract || '',
          journal: article.journal || '',
          publication_year: article.publication_year,
          doi: article.doi,
          extracted_features: article.extracted_features || {},
          source: article.source
        },
        conversation_history: conversationHistory
      };

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/article-chat/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'metadata':
                    // Could use metadata for UI state if needed
                    break;
                  case 'content':
                    onChunk(data.data.content);
                    break;
                  case 'done':
                    onComplete();
                    return;
                  case 'error':
                    onError(data.data.error);
                    return;
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', line, parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Article chat stream error:', error);
      onError(error instanceof Error ? error.message : 'Failed to get response from article chat');
    }
  }

  /**
   * Legacy non-streaming method for backward compatibility
   */
  async sendMessage(
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      this.sendMessageStream(
        message,
        article,
        conversationHistory,
        (chunk) => {
          fullResponse += chunk;
        },
        () => {
          resolve(fullResponse);
        },
        (error) => {
          reject(new Error(error));
        }
      );
    });
  }
}

export const articleChatApi = new ArticleChatApi();