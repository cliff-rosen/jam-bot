/**
 * Types for Smart Search Lab feature
 */

export interface SmartSearchRefinement {
  original_question: string;
  refined_question: string;
}

export interface SearchQueryGeneration {
  refined_question: string;
  search_query: string;
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

export interface SearchResults {
  articles: SearchArticle[];
  total_found: number;
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