/**
 * Article Group API client for Tabelizer
 * 
 * Handles saving and loading article groups with custom columns
 */

import { CanonicalResearchArticle } from '@/types/unifiedSearch';
import { TabelizerColumn } from '@/components/features/tabelizer/types';
import { api } from './index';

// Types
export interface ArticleGroup {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  search_query?: string;
  search_provider?: string;
  search_params?: any;
  columns: TabelizerColumnMetadata[];
  created_at: string;
  updated_at: string;
  article_count: number;
}

export interface TabelizerColumnMetadata {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'text' | 'score';
  options?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

export interface ArticleGroupDetail extends ArticleGroup {
  articles: CanonicalResearchArticle[];
  columns: TabelizerColumn[];
}

export interface CreateArticleGroupRequest {
  name: string;
  description?: string;
  search_query?: string;
  search_provider?: string;
  search_params?: any;
}

export interface SaveToGroupRequest {
  articles: CanonicalResearchArticle[];
  columns: TabelizerColumnMetadata[];
  search_query?: string;
  search_provider?: string;
  search_params?: any;
  overwrite?: boolean;
}

export interface ArticleGroupListResponse {
  groups: ArticleGroup[];
  total: number;
}

export interface ArticleGroupSaveResponse {
  success: boolean;
  message: string;
  group_id: string;
  articles_saved: number;
}

export interface ArticleGroupDeleteResponse {
  success: boolean;
  message: string;
}

// API Client
export const articleGroupApi = {
  /**
   * List user's article groups
   */
  async listGroups(skip = 0, limit = 50): Promise<ArticleGroupListResponse> {
    const response = await api.get<ArticleGroupListResponse>(
      `/api/tabelizer/groups?skip=${skip}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Create a new article group
   */
  async createGroup(request: CreateArticleGroupRequest): Promise<ArticleGroup> {
    const response = await api.post<ArticleGroup>(
      '/api/tabelizer/groups',
      request
    );
    return response.data;
  },

  /**
   * Get specific article group with articles and columns
   */
  async getGroup(groupId: string): Promise<ArticleGroupDetail> {
    const response = await api.get<ArticleGroupDetail>(
      `/api/tabelizer/groups/${groupId}`
    );
    return response.data;
  },

  /**
   * Update article group metadata
   */
  async updateGroup(groupId: string, request: { name: string; description?: string }): Promise<ArticleGroup> {
    const response = await api.put<ArticleGroup>(
      `/api/tabelizer/groups/${groupId}`,
      request
    );
    return response.data;
  },

  /**
   * Delete article group
   */
  async deleteGroup(groupId: string): Promise<ArticleGroupDeleteResponse> {
    const response = await api.delete<ArticleGroupDeleteResponse>(
      `/api/tabelizer/groups/${groupId}`
    );
    return response.data;
  },

  /**
   * Save current tabelizer state to an existing group
   */
  async saveToGroup(groupId: string, request: SaveToGroupRequest): Promise<ArticleGroupSaveResponse> {
    const response = await api.post<ArticleGroupSaveResponse>(
      `/api/tabelizer/groups/${groupId}/save`,
      request
    );
    return response.data;
  },

  /**
   * Create a new group and save data to it
   */
  async createAndSaveGroup(
    name: string,
    description: string | undefined,
    request: SaveToGroupRequest
  ): Promise<ArticleGroupSaveResponse> {
    const params = new URLSearchParams({ name });
    if (description) {
      params.append('description', description);
    }
    
    const response = await api.post<ArticleGroupSaveResponse>(
      `/api/tabelizer/groups/create-and-save?${params.toString()}`,
      request
    );
    return response.data;
  },

  /**
   * Convert TabelizerColumn to metadata format for saving
   */
  columnToMetadata(column: TabelizerColumn): TabelizerColumnMetadata {
    return {
      id: column.id,
      name: column.name,
      description: column.description,
      type: column.type,
      options: column.options
    };
  }
};