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