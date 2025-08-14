/**
 * Smart Search API Client
 * 
 * API functions for Smart Search functionality in the Lab.
 */

import { api } from './index';
import { makeStreamRequest } from './streamUtils';
import type {
  SmartSearchRefinement,
  SearchQueryGeneration,
  SearchResults,
  FilteredArticle,
  StreamMessage
} from '@/types/smart-search';

export interface SmartSearchRequest {
  query: string;
  max_results?: number;
}

export interface SearchQueryRequest {
  refined_query: string;
}

export interface ArticleSearchRequest {
  search_query: string;
  max_results?: number;
}

export interface SemanticFilterRequest {
  articles: any[];
  refined_query: string;
  search_query: string;
  strictness?: 'low' | 'medium' | 'high';
}

class SmartSearchApi {
  /**
   * Step 2: Refine a search query
   */
  async refineQuery(request: SmartSearchRequest): Promise<SmartSearchRefinement> {
    const response = await api.post('/api/lab/smart-search/refine', request);
    return response.data;
  }

  /**
   * Step 3: Generate boolean search query from refined query
   */
  async generateSearchQuery(request: SearchQueryRequest): Promise<SearchQueryGeneration> {
    const response = await api.post('/api/lab/smart-search/generate-query', request);
    return response.data;
  }

  /**
   * Step 4: Execute search with boolean query
   */
  async executeSearch(request: ArticleSearchRequest): Promise<SearchResults> {
    const response = await api.post('/api/lab/smart-search/execute', request);
    return response.data;
  }

  /**
   * Filter articles with semantic discriminator (streaming)
   */
  async filterArticlesStreaming(
    request: SemanticFilterRequest,
    onMessage: (message: StreamMessage) => void,
    onArticle: (article: FilteredArticle) => void,
    onComplete: (stats: any) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const streamGenerator = makeStreamRequest('/api/lab/smart-search/filter-stream', request, 'POST');
      
      let buffer = '';
      
      for await (const update of streamGenerator) {
        buffer += update.data;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const message: StreamMessage = JSON.parse(data);
                
                // Route message to appropriate handler
                switch (message.type) {
                  case 'article':
                    if (message.data) {
                      onArticle(message.data as FilteredArticle);
                    }
                    break;
                  
                  case 'complete':
                    if (message.data) {
                      onComplete(message.data);
                    }
                    return;
                  
                  case 'error':
                    onError(message.message || 'Unknown error');
                    return;
                  
                  default:
                    onMessage(message);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE message:', data);
              }
            }
          }
        }
      }
      
      // Process any remaining data
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data) {
          try {
            const message: StreamMessage = JSON.parse(data);
            if (message.type === 'complete' && message.data) {
              onComplete(message.data);
            }
          } catch (parseError) {
            console.warn('Failed to parse final SSE message:', data);
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export const smartSearchApi = new SmartSearchApi();