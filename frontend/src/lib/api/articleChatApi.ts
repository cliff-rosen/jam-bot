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
   * Send a message about an article and get a response
   */
  async sendMessage(
    message: string,
    article: CanonicalResearchArticle,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
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

      const response = await api.post<ArticleChatResponse>(
        '/api/article-chat/chat',
        request
      );

      return response.data.response;
    } catch (error) {
      console.error('Article chat error:', error);
      throw new Error('Failed to get response from article chat');
    }
  }
}

export const articleChatApi = new ArticleChatApi();