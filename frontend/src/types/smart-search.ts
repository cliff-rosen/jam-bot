/**
 * Smart Search Domain Models
 * 
 * Core business objects for the Smart Search feature.
 * These are shared data structures used across multiple components.
 * API-specific request/response models are defined in @/lib/api/smartSearchApi.
 */

import { CanonicalResearchArticle } from './canonical_types';

// Re-export the canonical type for convenience
export type { CanonicalResearchArticle } from './canonical_types';

// Legacy alias for backward compatibility during migration  
export type SearchArticle = CanonicalResearchArticle;

export interface SearchPaginationInfo {
  total_available: number;
  returned: number;
  offset: number;
  has_more: boolean;
}

export interface FilteredArticle {
  article: CanonicalResearchArticle;
  passed: boolean;
  confidence: number;
  reasoning: string;
}

export interface FilteringProgress {
  total: number;
  processed: number;
  accepted: number;
  rejected: number;
  current_article?: string;
}

// More flexible version for session storage
export interface FilteredArticleForSession {
  article: Record<string, any>; // Flexible schema for session storage
  passed: boolean;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// Session Management Types (matching backend schemas)
// ============================================================================

export interface SmartSearchSession {
  id: string;
  user_id: string;
  created_at: string | null;
  updated_at: string | null;
  original_question: string;
  generated_evidence_spec: string | null;
  submitted_evidence_spec: string | null;
  generated_search_keywords: string | null;
  submitted_search_keywords: string | null;
  search_metadata: {
    total_available?: number;
    total_retrieved?: number;
    sources_searched?: string[];
    [key: string]: any;
  } | null;
  articles_retrieved_count: number;
  articles_selected_count: number;
  generated_discriminator: string | null;
  submitted_discriminator: string | null;
  filter_strictness: 'low' | 'medium' | 'high' | null;
  filtering_metadata: {
    accepted?: number;
    rejected?: number;
    total_processed?: number;
    custom_columns?: any[];
    [key: string]: any;
  } | null;
  filtered_articles: FilteredArticleForSession[] | null;
  status: string;
  last_step_completed: string | null;
  session_duration_seconds: number | null;
  total_api_calls: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
}

export interface SessionListResponse {
  sessions: SmartSearchSession[];
  total: number;
}

export interface SessionResetResponse {
  message: string;
  session: SmartSearchSession;
}