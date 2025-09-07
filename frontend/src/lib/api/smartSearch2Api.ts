/**
 * SmartSearch2 API Client
 * 
 * Direct search API functions for SmartSearch2 - no session management required.
 */

import { api } from './index';
import type { CanonicalResearchArticle } from '@/types/canonical_types';
import type { SearchPaginationInfo } from '@/types/smart-search';

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
     * Direct search using GET method (for simple queries)
     */
    async searchGet(
        query: string,
        source: 'pubmed' | 'google_scholar',
        maxResults: number = 50,
        offset: number = 0
    ): Promise<DirectSearchResponse> {
        const params = new URLSearchParams({
            query,
            source,
            max_results: maxResults.toString(),
            offset: offset.toString()
        });

        const response = await api.get(`/api/smart-search-2/search?${params}`);
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
}

// Export singleton instance
export const smartSearch2Api = new SmartSearch2Api();
