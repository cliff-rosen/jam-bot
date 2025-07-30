/**
 * Workbench Core Types
 * 
 * Core business object types for the workbench functionality
 * These must align exactly with the backend schemas in workbench.py
 */

import { CanonicalResearchArticle } from './canonical_types';

// ================== COLUMN METADATA AND DATA STRUCTURES ==================

export interface WorkbenchColumnMetadata {
  name: string;
  description: string;
  type: 'boolean' | 'text' | 'score' | 'number';
  options?: {
    min?: number;
    max?: number;
    step?: number;
    choices?: string[];
  };
  is_extracted: boolean;
  extraction_method?: 'ai' | 'manual' | 'computed';
}

export interface WorkbenchColumn {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'text' | 'score' | 'number';
  data: Record<string, string>; // articleId -> value
  options?: {
    min?: number;
    max?: number;
    step?: number;
    choices?: string[];
  };
}

// Note: TabelizerColumnData is internal to backend - frontend uses WorkbenchColumn

// ================== ARTICLE GROUP STRUCTURES ==================

export interface ArticleGroupItem {
  article: CanonicalResearchArticle;
  position: number;
  column_data: Record<string, any>;
  workbench_summary: {
    has_notes: boolean;
    feature_count: number;
    tags: string[];
    rating?: number;
  };
}

export interface ArticleGroupDetail {
  id: string;
  name: string;
  description?: string;
  article_count: number;
  columns: WorkbenchColumnMetadata[];
  search_context?: {
    query: string;
    provider: string;
    parameters: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
  articles: ArticleGroupItem[];
}

export interface ArticleGroup {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  search_query?: string;
  search_provider?: string;
  search_params?: any;
  columns: WorkbenchColumnMetadata[];
  article_count: number;
  created_at: string;
  updated_at: string;
}

// ================== ADDITIONAL FRONTEND TYPES ==================

export interface WorkbenchState {
  articles: CanonicalResearchArticle[];
  columns: WorkbenchColumn[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ArticleGroupSummary {
  id: string;
  name: string;
  description?: string;
  article_count: number;
  created_at: string;
  updated_at: string;
  preview_articles: ArticlePreview[];
}

export interface ArticlePreview {
  id: string;
  title: string;
  journal?: string;
  publication_year?: number;
}

// ================== INDIVIDUAL ARTICLE RESEARCH TYPES ==================

export interface WorkbenchData {
  article: CanonicalResearchArticle;
  workbench: {
    notes: string;
    features: Record<string, ExtractedFeature>;
    metadata: WorkbenchMetadata;
    position: number;
    created_at: string;
    updated_at?: string;
  };
  group_context: {
    group_id: string;
    group_name: string;
    total_articles: number;
  };
}

export interface ExtractedFeature {
  value: string | number | boolean;
  type: 'boolean' | 'text' | 'score' | 'number';
  extraction_method: 'ai' | 'manual';
  extraction_prompt?: string;
  confidence_score?: number;
  extracted_at: string;
  extracted_by?: string;
  error?: string;
}

export interface WorkbenchMetadata {
  tags: string[];
  rating?: number; // 1-5 stars
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'reading' | 'read' | 'reviewed' | 'archived';
  custom_fields?: Record<string, any>;
}

// ================== ANALYSIS PRESET TYPES ==================

export interface AnalysisPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  columns: Record<string, {
    description: string;
    type: 'boolean' | 'text' | 'score' | 'number';
    options?: {
      min?: number;
      max?: number;
      step?: number;
      choices?: string[];
    };
  }>;
  created_at: string;
  usage_count: number;
}

// ================== LEGACY TYPE ALIASES ==================
// For backward compatibility during migration

/** @deprecated Use WorkbenchColumn instead */
export type TabelizerColumn = WorkbenchColumn;

/** @deprecated Use WorkbenchColumnMetadata instead */  
export type TabelizerColumnData = WorkbenchColumnMetadata;

/** @deprecated Use WorkbenchState instead */
export type TabelizerState = WorkbenchState;

/** @deprecated Use AnalysisPreset instead */
export type TabelizerPreset = AnalysisPreset;