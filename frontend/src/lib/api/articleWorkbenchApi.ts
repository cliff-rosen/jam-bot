/**
 * Article Workbench API - Simple, clean API for workbench functionality
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface WorkbenchData {
  article_data: any;
  notes: string;
  extracted_features: Record<string, any>;
  metadata: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string | null;
}

class ArticleWorkbenchApi {
  private baseUrl = `${API_BASE_URL}/api/workbench`;

  async getWorkbenchData(groupId: string, articleId: string): Promise<WorkbenchData> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${this.baseUrl}/groups/${groupId}/articles/${articleId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async updateNotes(groupId: string, articleId: string, notes: string): Promise<{ notes: string; updated_at: string }> {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${this.baseUrl}/groups/${groupId}/articles/${articleId}/notes`, {
      notes
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async updateFeatures(groupId: string, articleId: string, features: Record<string, any>): Promise<{ extracted_features: Record<string, any>; updated_at: string }> {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${this.baseUrl}/groups/${groupId}/articles/${articleId}/features`, {
      features
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async updateMetadata(groupId: string, articleId: string, metadata: Record<string, any>): Promise<{ metadata: Record<string, any>; updated_at: string }> {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${this.baseUrl}/groups/${groupId}/articles/${articleId}/metadata`, {
      metadata
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    const token = localStorage.getItem('token');
    const response = await axios.post(`${this.baseUrl}/groups/${groupId}/articles/${articleId}/extract-feature`, {
      feature_name: featureName,
      feature_type: featureType,
      extraction_prompt: extractionPrompt
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async deleteFeature(groupId: string, articleId: string, featureName: string): Promise<{ message: string }> {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${this.baseUrl}/groups/${groupId}/articles/${articleId}/features/${featureName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

export const articleWorkbenchApi = new ArticleWorkbenchApi();