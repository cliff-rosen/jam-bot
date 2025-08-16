/**
 * Types for Smart Search Lab feature
 */

export interface SmartSearchRefinement {
  original_query: string;
  evidence_specification: string;
  session_id: string;
}

export interface SearchQueryGeneration {
  evidence_specification: string;
  search_query: string;
  session_id: string;
}

export interface SearchArticle {
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

export interface SearchResults {
  articles: SearchArticle[];
  pagination: SearchPaginationInfo;
  sources_searched: string[];
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

export interface StreamMessage {
  type: 'status' | 'progress' | 'article' | 'complete' | 'error';
  message?: string;
  data?: any;
  timestamp: string;
}