/**
 * Smart Search Domain Models
 * 
 * Core business objects for the Smart Search feature.
 * These are shared data structures used across multiple components.
 * API-specific request/response models are defined in @/lib/api/smartSearchApi.
 */

// Core Domain Models
export interface SearchArticle {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  pmid?: string;
  url?: string;
  source: string;
}

export interface SearchPaginationInfo {
  total_available: number;
  returned: number;
  offset: number;
  has_more: boolean;
}

export interface FilteredArticle {
  article: SearchArticle;
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