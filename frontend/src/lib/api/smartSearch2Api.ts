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
    query: string;
}

export interface EvidenceSpecResponse {
    original_query: string;
    evidence_specification: string;
}

export interface KeywordGenerationRequest {
    evidence_specification: string;
    source: 'pubmed' | 'google_scholar';
}

export interface KeywordGenerationResponse {
    evidence_specification: string;
    search_keywords: string;
    source: string;
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
     * Generate evidence specification from research question
     */
    async createEvidenceSpec(request: EvidenceSpecRequest): Promise<EvidenceSpecResponse> {
        const response = await api.post('/api/smart-search-2/evidence-spec', request);
        return response.data;
    }

    /**
     * Generate search keywords from evidence specification
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
