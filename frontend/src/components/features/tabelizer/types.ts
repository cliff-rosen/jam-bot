import { CanonicalResearchArticle } from '@/types/unifiedSearch';

export interface TabelizerColumn {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'text';
  data: Record<string, string>; // articleId -> value
}

export interface TabelizerState {
  articles: CanonicalResearchArticle[];
  columns: TabelizerColumn[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ExtractColumnRequest {
  articles: Array<{
    id: string;
    title: string;
    abstract: string;
  }>;
  column_name: string;
  column_description: string;
  column_type: 'boolean' | 'text';
}

export interface ExtractColumnResponse {
  results: Record<string, string>;
}