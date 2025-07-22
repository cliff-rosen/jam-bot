/**
 * Unified Search API Client
 * 
 * Provides API integration for the unified search system that works
 * with multiple academic search providers.
 */

import { 
  UnifiedSearchParams, 
  UnifiedSearchResponse, 
  BatchSearchRequest,
  BatchSearchResponse,
  SearchProvider,
  ProviderInfo,
  CanonicalResearchArticle
} from '@/types/unifiedSearch';

const API_BASE = '/api/unified-search';

class UnifiedSearchApi {
  /**
   * Get list of all registered search providers
   */
  async getProviders(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/providers`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get providers: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get list of currently available search providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/providers/available`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get available providers: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Perform a unified search with a single provider
   */
  async search(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    const searchParams = new URLSearchParams({
      provider: params.provider,
      query: params.query,
      num_results: params.num_results.toString(),
      sort_by: params.sort_by,
    });

    // Add optional parameters
    if (params.year_low !== undefined) {
      searchParams.append('year_low', params.year_low.toString());
    }
    if (params.year_high !== undefined) {
      searchParams.append('year_high', params.year_high.toString());
    }

    const response = await fetch(`${API_BASE}/search?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform batch search across multiple providers
   */
  async batchSearch(request: BatchSearchRequest): Promise<BatchSearchResponse> {
    const searchParams = new URLSearchParams({
      query: request.query,
      num_results: request.num_results.toString(),
      sort_by: request.sort_by,
    });

    // Add providers
    request.providers.forEach(provider => {
      searchParams.append('providers', provider);
    });

    // Add optional parameters
    if (request.year_low !== undefined) {
      searchParams.append('year_low', request.year_low.toString());
    }
    if (request.year_high !== undefined) {
      searchParams.append('year_high', request.year_high.toString());
    }

    const response = await fetch(`${API_BASE}/search/batch?${searchParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Batch search failed: ${response.statusText}`);
    }

    const results = await response.json();
    return { results };
  }

  /**
   * Extract features from unified articles
   * Uses the existing extraction endpoints with unified article format
   */
  async extractFeatures(
    articles: CanonicalResearchArticle[], 
    provider: SearchProvider
  ): Promise<{ results: any[]; metadata: any }> {
    const endpoint = provider === 'scholar' 
      ? '/api/extraction/scholar-features'
      : '/api/extraction/pubmed-features';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ articles }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `Feature extraction failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert legacy Scholar articles to unified format (client-side helper)
   */
  convertScholarToUnified(
    scholarArticles: any[], 
    searchPosition: number = 0
  ): CanonicalResearchArticle[] {
    return scholarArticles.map((article, index) => ({
      id: `scholar_${searchPosition + index + 1}`,
      source: 'scholar' as const,
      title: article.title || '',
      authors: article.authors || [],
      abstract: undefined,
      snippet: article.snippet,
      journal: this.extractJournalFromPublicationInfo(article.publication_info),
      publication_date: undefined,
      publication_year: article.year,
      doi: undefined,
      url: article.link,
      pdf_url: article.pdf_link,
      keywords: [],
      mesh_terms: [],
      categories: [],
      citation_count: article.cited_by_count,
      cited_by_url: article.cited_by_link,
      related_articles_url: article.related_pages_link,
      versions_url: article.versions_link,
      search_position: searchPosition + index + 1,
      relevance_score: undefined,
      extracted_features: article.metadata?.features,
      quality_scores: undefined,
      source_metadata: {
        position: article.position,
        publication_info: article.publication_info,
        ...article.metadata
      },
      indexed_at: undefined,
      retrieved_at: new Date().toISOString(),
    }));
  }

  /**
   * Convert legacy PubMed articles to unified format (client-side helper)
   */
  convertPubMedToUnified(pubmedArticles: any[]): CanonicalResearchArticle[] {
    return pubmedArticles.map((article, index) => ({
      id: `pubmed_${article.pmid}`,
      source: 'pubmed' as const,
      title: article.title || '',
      authors: article.authors || [],
      abstract: article.abstract,
      snippet: undefined,
      journal: article.journal,
      publication_date: article.publication_date,
      publication_year: article.publication_date ? 
        parseInt(article.publication_date.split('-')[0]) : undefined,
      doi: article.doi,
      url: article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : undefined,
      pdf_url: undefined,
      keywords: article.keywords || [],
      mesh_terms: article.mesh_terms || [],
      categories: [],
      citation_count: article.citation_count,
      cited_by_url: undefined,
      related_articles_url: article.pmid ? 
        `https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed&from_uid=${article.pmid}` : undefined,
      versions_url: undefined,
      search_position: index + 1,
      relevance_score: undefined,
      extracted_features: article.metadata?.features,
      quality_scores: undefined,
      source_metadata: article.metadata,
      indexed_at: undefined,
      retrieved_at: new Date().toISOString(),
    }));
  }

  private extractJournalFromPublicationInfo(publicationInfo?: string): string | undefined {
    if (!publicationInfo) return undefined;
    
    // Publication info format: "Journal Name, Volume, Pages, Year"
    const parts = publicationInfo.split(',');
    return parts.length > 0 ? parts[0].trim() : undefined;
  }
}

export const unifiedSearchApi = new UnifiedSearchApi();