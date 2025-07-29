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
  // Core types
  WorkbenchData,

  // Request types
  CreateArticleGroupRequest,
  UpdateArticleGroupRequest,
  SaveToGroupRequest,
  AddArticlesRequest,
  ExtractColumnRequest,
  ExtractMultipleColumnsRequest,
  BatchExtractFeaturesRequest,
  BatchUpdateMetadataRequest,

  // Response types
  ArticleGroupListResponse,
  ArticleGroupResponse,
  ArticleGroupDetailResponse,
  ArticleGroupSaveResponse,
  ArticleGroupDeleteResponse,
  ExtractColumnResponse,
  ExtractMultipleColumnsResponse,
  BatchOperationResponse,
  AnalysisPresetsResponse
} from '@/types/workbench';

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

  async createGroup(request: CreateArticleGroupRequest): Promise<ArticleGroupResponse> {
    const response = await api.post('/api/workbench/groups', request);
    return response.data;
  }

  async getGroupDetail(groupId: string): Promise<ArticleGroupDetailResponse> {
    const response = await api.get(`/api/workbench/groups/${groupId}`);
    return response.data;
  }

  async updateGroup(groupId: string, request: UpdateArticleGroupRequest): Promise<ArticleGroupResponse> {
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