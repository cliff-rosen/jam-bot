import { api, handleApiError } from './index';
import { CanonicalScholarArticle } from '@/types/canonical_types';

export interface GoogleScholarSearchRequest {
    query: string;
    num_results?: number;
    year_low?: number;
    year_high?: number;
    sort_by?: 'relevance' | 'date';
}

export interface GoogleScholarSearchResponse {
    articles: CanonicalScholarArticle[];
    metadata: Record<string, any>;
    success: boolean;
}

export const googleScholarApi = {
    /**
     * Search Google Scholar for academic articles
     */
    async search(params: GoogleScholarSearchRequest): Promise<GoogleScholarSearchResponse> {
        try {
            const response = await api.post<GoogleScholarSearchResponse>(
                '/api/google-scholar/search',
                params
            );
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Test Google Scholar/SerpAPI connection
     */
    async testConnection(): Promise<{
        status: 'success' | 'error';
        message: string;
        api_configured: boolean;
        test_results?: number;
    }> {
        try {
            const response = await api.get('/api/google-scholar/test-connection');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }
}; 