import { WorkbenchFilters } from '../search/types';

export const DEFAULT_FILTERS: WorkbenchFilters = {
    poi_relevance: 'all',
    doi_relevance: 'all',
    is_systematic: 'all',
    study_type: 'all',
    study_outcome: 'all',
    min_confidence: 0,
    min_relevance_score: 0
};

export const STUDY_TYPE_OPTIONS = [
    'all',
    'human RCT',
    'human non-RCT',
    'non-human life science',
    'non life science',
    'not a study'
] as const;

export const STUDY_OUTCOME_OPTIONS = [
    'all',
    'effectiveness',
    'safety',
    'diagnostics',
    'biomarker',
    'other'
] as const;

export const RELEVANCE_OPTIONS = ['all', 'yes', 'no'] as const; 