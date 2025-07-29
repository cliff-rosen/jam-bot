/**
 * Unified Workbench API Client
 * 
 * Single API client that handles:
 * - Article group management (table view, collections)
 * - Individual article research (deep dive, notes, features)  
 * - Analysis operations (column extraction, bulk operations)
 */

import { api } from './index';
import {
  WorkbenchColumnMetadata,
  ArticleGroup,
  ArticleGroupDetail,
  ArticleGroupSummary,
  WorkbenchData,
  AnalysisPreset
} from '@/types/workbench';
import { CanonicalResearchArticle } from '@/types/canonical_types';

// ================== REQUEST/RESPONSE TYPES ==================

// Article Group Management Requests
export interface CreateArticleGroupRequest {
  name: string;
  description?: string;
  articles?: CanonicalResearchArticle[];
  columns?: WorkbenchColumnMetadata[];
  search_context?: {
    query: string;
    provider: string;
    parameters: Record<string, any>;
  };
}

export interface UpdateArticleGroupRequest {
  name?: string;
  description?: string;
  columns?: WorkbenchColumnMetadata[];
}

export interface SaveToGroupRequest {
  group_name: string;
  group_description?: string;
  articles: CanonicalResearchArticle[];
  columns: WorkbenchColumnMetadata[];
  search_query?: string;
  search_provider?: string;
  search_params?: Record<string, any>;
}

export interface AddArticlesRequest {
  articles: CanonicalResearchArticle[];
  extract_columns?: boolean;
}

// Analysis Requests
export interface ExtractColumnRequest {
  articles: Array<{
    id: string;
    title: string;
    abstract: string;
  }>;
  column_name: string;
  column_description: string;
  column_type: 'boolean' | 'text' | 'score' | 'number';
  column_options?: {
    min?: number;
    max?: number;
    step?: number;
    choices?: string[];
  };
}

export interface ExtractMultipleColumnsRequest {
  articles: Array<{
    id: string;
    title: string;
    abstract: string;
  }>;
  columns_config: Record<string, {
    description: string;
    type: 'boolean' | 'text' | 'score' | 'number';
    options?: {
      min?: number;
      max?: number;
      step?: number;
      choices?: string[];
    };
  }>;
}

export interface BatchExtractFeaturesRequest {
  article_ids: string[];
  feature_name: string;
  feature_type: 'boolean' | 'text' | 'score' | 'number';
  extraction_prompt: string;
}

export interface BatchUpdateMetadataRequest {
  metadata_updates: Record<string, Record<string, any>>; // article_id -> metadata
}

// Response Types
export interface ArticleGroupListResponse {
  groups: ArticleGroupSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ArticleGroupResponse {
  group: ArticleGroupDetail;
  message?: string;
}

export interface ArticleGroupDetailResponse {
  group: ArticleGroupDetail;
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
  deleted_group_id: string;
  deleted_articles_count: number;
}

export interface ExtractColumnResponse {
  results: Record<string, string>; // articleId -> value
  metadata?: Record<string, any>;
}

export interface ExtractMultipleColumnsResponse {
  results: Record<string, Record<string, string>>; // articleId -> columnName -> value
  metadata?: Record<string, any>;
}

export interface BatchOperationResponse {
  results: Record<string, any>;
  failures: Record<string, string>;
  summary: {
    total_requested: number;
    successful: number;
    failed: number;
  };
}

export interface AnalysisPresetsResponse {
  presets: AnalysisPreset[];
  categories: string[];
}

export class WorkbenchApi {

  // ================== GROUP MANAGEMENT ==================

  async getGroups(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<ArticleGroupListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const response = await api.get(`/api/workbench/groups?${params}`);
    return response.data;
  }

  async createGroup(request: CreateArticleGroupRequest): Promise<ArticleGroup> {
    const response = await api.post('/api/workbench/groups', request);
    return response.data;
  }

  async getGroupDetail(groupId: string): Promise<ArticleGroupDetail> {
    const response = await api.get(`/api/workbench/groups/${groupId}`);
    return response.data;
  }

  async updateGroup(groupId: string, request: UpdateArticleGroupRequest): Promise<ArticleGroup> {
    const response = await api.put(`/api/workbench/groups/${groupId}`, request);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<ArticleGroupDeleteResponse> {
    const response = await api.delete(`/api/workbench/groups/${groupId}`);
    return response.data;
  }

  async addArticlesToGroup(groupId: string, request: AddArticlesRequest): Promise<ArticleGroupSaveResponse> {
    const response = await api.post(`/api/workbench/groups/${groupId}/articles`, request);
    return response.data;
  }

  // Convenience methods (legacy support)
  async saveWorkbenchState(groupId: string, request: SaveToGroupRequest): Promise<ArticleGroupSaveResponse> {
    const response = await api.post(`/api/workbench/groups/${groupId}/save`, request);
    return response.data;
  }

  async createAndSaveGroup(request: SaveToGroupRequest): Promise<ArticleGroupSaveResponse> {
    const response = await api.post('/api/workbench/groups/create-and-save', request);
    return response.data;
  }

  // ================== ANALYSIS OPERATIONS ==================

  async extractColumn(request: ExtractColumnRequest): Promise<ExtractColumnResponse> {
    const response = await api.post('/api/workbench/analysis/extract-column', request);
    return response.data;
  }

  async extractColumnForGroup(groupId: string, request: ExtractColumnRequest): Promise<ExtractColumnResponse> {
    const response = await api.post(`/api/workbench/groups/${groupId}/extract-column`, request);
    return response.data;
  }

  async extractMultipleColumns(request: ExtractMultipleColumnsRequest): Promise<ExtractMultipleColumnsResponse> {
    const response = await api.post('/api/workbench/analysis/extract-multiple-columns', request);
    return response.data;
  }

  async getAnalysisPresets(): Promise<AnalysisPresetsResponse> {
    const response = await api.get('/api/workbench/analysis/presets');
    return response.data;
  }

  // ================== INDIVIDUAL ARTICLE RESEARCH ==================

  async getArticleWorkbenchData(groupId: string, articleId: string): Promise<WorkbenchData> {
    const response = await api.get(`/api/workbench/groups/${groupId}/articles/${articleId}`);
    return response.data;
  }

  async updateNotes(groupId: string, articleId: string, notes: string): Promise<{ notes: string; updated_at: string }> {
    const response = await api.put(`/api/workbench/groups/${groupId}/articles/${articleId}/notes`, {
      notes
    });
    return response.data;
  }

  async updateMetadata(groupId: string, articleId: string, metadata: Record<string, any>): Promise<{ metadata: Record<string, any>; updated_at: string }> {
    const response = await api.put(`/api/workbench/groups/${groupId}/articles/${articleId}/metadata`, {
      metadata
    });
    return response.data;
  }

  async extractFeature(
    groupId: string,
    articleId: string,
    featureName: string,
    featureType: string,
    extractionPrompt: string
  ): Promise<{ feature_name: string; feature_data: any; updated_at: string }> {
    const response = await api.post(`/api/workbench/groups/${groupId}/articles/${articleId}/extract-feature`, {
      feature_name: featureName,
      feature_type: featureType,
      extraction_prompt: extractionPrompt
    });
    return response.data;
  }

  async deleteFeature(groupId: string, articleId: string, featureName: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/workbench/groups/${groupId}/articles/${articleId}/features/${featureName}`);
    return response.data;
  }

  // ================== BATCH OPERATIONS ==================

  async batchExtractFeatures(groupId: string, request: BatchExtractFeaturesRequest): Promise<BatchOperationResponse> {
    const response = await api.post(`/api/workbench/groups/${groupId}/batch/extract-features`, request);
    return response.data;
  }

  async batchUpdateMetadata(groupId: string, request: BatchUpdateMetadataRequest): Promise<BatchOperationResponse> {
    const response = await api.put(`/api/workbench/groups/${groupId}/batch/metadata`, request);
    return response.data;
  }

  // ================== UTILITY METHODS ==================

  /**
   * Convert articles to extraction format for analysis operations
   */
  convertArticlesForExtraction(articles: any[]): Array<{ id: string, title: string, abstract: string }> {
    return articles.map(article => ({
      id: article.id,
      title: article.title || '',
      abstract: article.abstract || ''
    }));
  }

  /**
   * Export articles and data as CSV
   */
  exportAsCSV(articles: any[], columns: any[], filename: string = 'workbench-data.csv'): void {
    // Create headers
    const headers = ['Title', 'Authors', 'Journal', 'Year', 'URL'];
    columns.forEach(col => headers.push(col.name));

    // Create rows
    const rows = articles.map(article => {
      const row = [
        article.title || '',
        (article.authors || []).join('; '),
        article.journal || '',
        article.publication_year || article.year || '',
        article.url || ''
      ];

      // Add column data
      columns.forEach(col => {
        row.push(col.data[article.id] || '');
      });

      return row;
    });

    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

// Export singleton instance
export const workbenchApi = new WorkbenchApi();

// Legacy exports for backward compatibility
export {
  workbenchApi as tabelizerApi,
  workbenchApi as articleGroupApi,
  workbenchApi as articleWorkbenchApi
};