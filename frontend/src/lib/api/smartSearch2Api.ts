/**
 * SmartSearch2 API Client
 * 
 * Direct search API functions for SmartSearch2 - no session management required.
 */

import { api } from './index';
import type { CanonicalResearchArticle } from '@/types/canonical_types';
import type { SearchPaginationInfo } from '@/types/smart-search';
import type { FeatureDefinition } from '@/types/workbench';
import type { 
    FeatureExtractionRequest as BaseFeatureExtractionRequest, 
    FeatureExtractionResponse as BaseFeatureExtractionResponse 
} from './smartSearchApi';

// ============================================================================
// API Request/Response Models
// ============================================================================

export interface DirectSearchRequest {
    query: string;
    source: 'pubmed' | 'google_scholar';
    max_results?: number;
    offset?: number;
}

export interface DirectSearchResponse {
    articles: CanonicalResearchArticle[];
    pagination: SearchPaginationInfo;
    source: string;
    query: string;
}

export interface EvidenceSpecRequest {
    user_description: string;
    conversation_history?: Array<{ question: string; answer: string }>;
}

export interface EvidenceSpecResponse {
    is_complete: boolean;
    evidence_specification: string | null;
    clarification_questions: string[] | null;
    completeness_score: number;
    missing_elements: string[];
    reasoning?: string;
}

export interface ConceptExtractionRequest {
    evidence_specification: string;
}

export interface ConceptExtractionResponse {
    concepts: string[];
    evidence_specification: string;
}

export interface KeywordGenerationRequest {
    concepts: string[];
    source: 'pubmed' | 'google_scholar';
    target_result_count?: number;
}

export interface ConceptExpansionRequest {
    concepts: string[];
    source: 'pubmed' | 'google_scholar';
}

export interface ConceptExpansionResponse {
    expansions: Array<{
        concept: string;
        expression: string;
        count: number;
    }>;
    source: string;
}

export interface KeywordCombinationRequest {
    expressions: string[];
    source: 'pubmed' | 'google_scholar';
}

export interface KeywordCombinationResponse {
    combined_query: string;
    estimated_results: number;
    source: string;
}

export interface KeywordGenerationResponse {
    concepts: string[];
    search_keywords: string;
    source: string;
    estimated_results: number;
    concept_counts: Record<string, number>;
    optimization_strategy: string;
}

// SmartSearch2-specific types (no session_id required)
export interface FeatureExtractionRequest extends Omit<BaseFeatureExtractionRequest, 'session_id'> {
    articles: CanonicalResearchArticle[];  // SmartSearch2 passes articles directly
}

export interface FeatureExtractionResponse extends Omit<BaseFeatureExtractionResponse, 'session_id'> {
    // Inherits results and extraction_metadata from base type
}

// ============================================================================
// API Client Implementation
// ============================================================================

class SmartSearch2Api {
    /**
     * Direct search without session management
     */
    async search(request: DirectSearchRequest): Promise<DirectSearchResponse> {
        const response = await api.post('/api/smart-search-2/search', request);
        return response.data;
    }


    /**
     * Refine evidence specification from user description (conversational)
     */
    async refineEvidenceSpec(request: EvidenceSpecRequest): Promise<EvidenceSpecResponse> {
        const response = await api.post('/api/smart-search-2/evidence-spec', request);
        return response.data;
    }

    /**
     * Extract key concepts from evidence specification
     */
    async extractConcepts(request: ConceptExtractionRequest): Promise<ConceptExtractionResponse> {
        const response = await api.post('/api/smart-search-2/extract-concepts', request);
        return response.data;
    }

    /**
     * Expand concepts to Boolean expressions with counts
     */
    async expandConcepts(request: ConceptExpansionRequest): Promise<ConceptExpansionResponse> {
        const response = await api.post('/api/smart-search-2/expand-concepts', request);
        return response.data;
    }

    /**
     * Test combination of Boolean expressions
     */
    async testKeywordCombination(request: KeywordCombinationRequest): Promise<KeywordCombinationResponse> {
        const response = await api.post('/api/smart-search-2/test-keyword-combination', request);
        return response.data;
    }

    /**
     * Generate optimized search keywords from extracted concepts
     */
    async generateKeywords(request: KeywordGenerationRequest): Promise<KeywordGenerationResponse> {
        const response = await api.post('/api/smart-search-2/generate-keywords', request);
        return response.data;
    }

    /**
     * Extract AI features from articles
     */
    async extractFeatures(request: FeatureExtractionRequest): Promise<FeatureExtractionResponse> {
        const response = await api.post('/api/smart-search-2/extract-features', request);
        return response.data;
    }
}

// Export singleton instance
export const smartSearch2Api = new SmartSearch2Api();
