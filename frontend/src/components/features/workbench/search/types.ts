import { GoogleScholarSearchRequest } from '@/lib/api/googleScholarApi';
import { CanonicalScholarArticle } from '@/types/canonical_types';

export interface WorkbenchSearchParams extends GoogleScholarSearchRequest { }

export interface WorkbenchFilters {
    poi_relevance: 'all' | 'yes' | 'no';
    doi_relevance: 'all' | 'yes' | 'no';
    is_systematic: 'all' | 'yes' | 'no';
    study_type: 'all' | 'human RCT' | 'human non-RCT' | 'non-human life science' | 'non life science' | 'not a study';
    study_outcome: 'all' | 'effectiveness' | 'safety' | 'diagnostics' | 'biomarker' | 'other';
    min_confidence: number;
    min_relevance_score: number;
}

export type SortOption = 'none' | 'relevance_score' | 'confidence_score';

export interface WorkbenchState {
    searchParams: WorkbenchSearchParams;
    articles: CanonicalScholarArticle[];
    metadata: Record<string, any>;
    loading: boolean;
    extracting: boolean;
    extractionMetadata: Record<string, any> | null;
    filters: WorkbenchFilters;
    showFilters: boolean;
    sortBy: SortOption;
} 