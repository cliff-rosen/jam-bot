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

export interface ExtractMultipleColumnsRequest {
  articles: Array<{
    id: string;
    title: string;
    abstract: string;
  }>;
  columns_config: Record<string, {
    description: string;
    type: 'boolean' | 'text';
  }>;
}

export interface ExtractMultipleColumnsResponse {
  results: Record<string, Record<string, string>>; // articleId -> columnName -> value
}

export interface TabelizerPreset {
  id: string;
  name: string;
  description: string;
  columns: Record<string, {
    description: string;
    type: 'boolean' | 'text';
  }>;
}