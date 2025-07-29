/**
 * Unified Workbench Types
 * 
 * All types related to the workbench functionality (table view + individual research)
 * Consolidates types from tabelizer, article groups, and workbench components
 */

import { CanonicalResearchArticle } from './unifiedSearch';

// ================== CORE WORKBENCH TYPES ==================

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

export interface WorkbenchState {
  articles: CanonicalResearchArticle[];
  columns: WorkbenchColumn[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// ================== ARTICLE GROUP TYPES ==================

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

// ================== API REQUEST/RESPONSE TYPES ==================

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

// Analysis API types
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

export interface ExtractColumnResponse {
  results: Record<string, string>; // articleId -> value
  metadata?: Record<string, any>;
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

export interface ExtractMultipleColumnsResponse {
  results: Record<string, Record<string, string>>; // articleId -> columnName -> value
  metadata?: Record<string, any>;
}

// Workbench API types
export interface UpdateNotesRequest {
  notes: string;
}

export interface UpdateMetadataRequest {
  metadata: Record<string, any>;
}

export interface ExtractFeatureRequest {
  feature_name: string;
  feature_type: 'boolean' | 'text' | 'score' | 'number';
  extraction_prompt: string;
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

// Response types
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
  message: string;
  deleted_group_id: string;
  deleted_articles_count: number;
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

export interface AnalysisPresetsResponse {
  presets: AnalysisPreset[];
  categories: string[];
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