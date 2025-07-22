/**
 * Unified Workbench Component
 * 
 * Main workbench component that supports searching across multiple providers
 * (PubMed, Google Scholar) with a unified interface and consistent results display.
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

import { 
  UnifiedSearchParams, 
  CanonicalResearchArticle, 
  SearchProvider, 
  UnifiedWorkbenchFilters,
  UnifiedSearchResponse,
  SearchMetadata 
} from '@/types/unifiedSearch';
import { unifiedSearchApi } from '@/lib/api/unifiedSearchApi';

import WorkbenchHeader from './WorkbenchHeader';
import { UnifiedSearchControls } from './search/UnifiedSearchControls';
import { UnifiedArticleCard } from './results/UnifiedArticleCard';
import MetadataDisplay from './results/MetadataDisplay';

// Default search parameters
const DEFAULT_SEARCH_PARAMS: UnifiedSearchParams = {
  provider: 'scholar',
  query: '',
  num_results: 10,
  sort_by: 'relevance',
  include_citations: true,
  include_pdf_links: true
};

// Default filters
const DEFAULT_FILTERS: UnifiedWorkbenchFilters = {
  sources: ['pubmed', 'scholar'],
  min_confidence: 0,
  min_relevance_score: 0,
  has_pdf: false,
  has_doi: false,
  clinical_relevance: 'all',
  study_design: 'all',
  evidence_level: 'all',
  methodology_quality: 'all',
  poi_relevance: 'all',
  doi_relevance: 'all',
  is_systematic: 'all',
  study_type: 'all',
  study_outcome: 'all'
};

interface UnifiedWorkbenchState {
  searchParams: UnifiedSearchParams;
  selectedProviders: SearchProvider[];
  searchMode: 'single' | 'multi';
  articles: CanonicalResearchArticle[];
  searchMetadata: SearchMetadata[];
  isSearching: boolean;
  isExtracting: boolean;
  searchError?: string;
  filters: UnifiedWorkbenchFilters;
  currentTab: string;
}

export function UnifiedWorkbench() {
  const [state, setState] = useState<UnifiedWorkbenchState>({
    searchParams: DEFAULT_SEARCH_PARAMS,
    selectedProviders: ['scholar'],
    searchMode: 'single',
    articles: [],
    searchMetadata: [],
    isSearching: false,
    isExtracting: false,
    filters: DEFAULT_FILTERS,
    currentTab: 'all'
  });

  const { toast } = useToast();

  // Filter articles based on current filters
  const filteredArticles = filterArticlesByCurrentSettings(state.articles, state.filters, state.currentTab);

  const handleSearch = async () => {
    if (!state.searchParams.query.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    if (state.searchMode === 'single' && !state.searchParams.provider) {
      toast({
        title: 'Error',
        description: 'Please select a search provider',
        variant: 'destructive'
      });
      return;
    }

    if (state.searchMode === 'multi' && state.selectedProviders.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one provider for batch search',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, searchError: undefined }));

    try {
      if (state.searchMode === 'single') {
        // Single provider search
        const response = await unifiedSearchApi.search(state.searchParams);
        
        if (response.success) {
          setState(prev => ({
            ...prev,
            articles: response.articles,
            searchMetadata: [response.metadata],
            currentTab: 'all'
          }));

          toast({
            title: 'Search Complete',
            description: `Found ${response.articles.length} article${response.articles.length !== 1 ? 's' : ''}`,
          });
        } else {
          throw new Error(response.error || 'Search failed');
        }
      } else {
        // Batch search across multiple providers
        await handleBatchSearch();
      }
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      setState(prev => ({
        ...prev,
        searchError: errorMessage
      }));

      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, isSearching: false }));
    }
  };

  const handleBatchSearch = async () => {
    const results: CanonicalResearchArticle[] = [];
    const metadata: SearchMetadata[] = [];
    const errors: string[] = [];

    for (const provider of state.selectedProviders) {
      try {
        const searchParams = { ...state.searchParams, provider };
        const response = await unifiedSearchApi.search(searchParams);
        
        if (response.success) {
          results.push(...response.articles);
          metadata.push(response.metadata);
        } else {
          errors.push(`${provider}: ${response.error || 'Search failed'}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider}: ${errorMessage}`);
      }
    }

    setState(prev => ({
      ...prev,
      articles: results,
      searchMetadata: metadata
    }));

    // Show results summary
    let toastMessage = `Found ${results.length} total article${results.length !== 1 ? 's' : ''}`;
    if (errors.length > 0) {
      toastMessage += ` (${errors.length} provider${errors.length !== 1 ? 's' : ''} failed)`;
    }

    toast({
      title: errors.length === state.selectedProviders.length ? 'Search Failed' : 'Search Complete',
      description: toastMessage,
      variant: errors.length > 0 ? 'destructive' : 'default'
    });
  };

  const handleExtractFeatures = async () => {
    if (filteredArticles.length === 0) {
      toast({
        title: 'No Articles',
        description: 'No articles available for feature extraction',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({ ...prev, isExtracting: true }));

    try {
      // Group articles by provider for extraction
      const articlesByProvider = groupArticlesByProvider(filteredArticles);
      const enrichedArticles: CanonicalResearchArticle[] = [];

      for (const [provider, articles] of Object.entries(articlesByProvider)) {
        if (articles.length === 0) continue;

        try {
          const response = await unifiedSearchApi.extractFeatures(
            articles, 
            provider as SearchProvider
          );

          // Process the enriched articles
          if (response.results) {
            response.results.forEach((result: any) => {
              const enrichedArticle = result.enriched_article;
              if (enrichedArticle) {
                enrichedArticles.push({
                  ...enrichedArticle,
                  extracted_features: enrichedArticle.metadata?.features,
                  quality_scores: enrichedArticle.metadata?.features?.relevance_score 
                    ? { relevance: enrichedArticle.metadata.features.relevance_score }
                    : undefined
                });
              }
            });
          }
        } catch (error) {
          console.error(`Feature extraction failed for ${provider}:`, error);
        }
      }

      // Update articles with extracted features
      setState(prev => ({
        ...prev,
        articles: prev.articles.map(article => {
          const enriched = enrichedArticles.find(ea => ea.id === article.id);
          return enriched || article;
        })
      }));

      toast({
        title: 'Feature Extraction Complete',
        description: `Processed ${enrichedArticles.length} article${enrichedArticles.length !== 1 ? 's' : ''}`,
      });

    } catch (error) {
      console.error('Feature extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, isExtracting: false }));
    }
  };

  const renderResults = () => {
    if (state.isSearching) {
      return (
        <Card className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Searching articles...</p>
        </Card>
      );
    }

    if (state.searchError) {
      return (
        <Card className="p-8 text-center bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500 dark:text-red-400" />
          <p className="text-red-600 dark:text-red-400 mb-2">Search failed</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{state.searchError}</p>
        </Card>
      );
    }

    if (state.articles.length === 0) {
      return (
        <Card className="p-8 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No articles found. Try adjusting your search terms.</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Search metadata */}
        {state.searchMetadata.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.searchMetadata.map((metadata, index) => (
              <Card key={index} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{metadata.provider}</Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {metadata.search_time.toFixed(2)}s
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {metadata.returned_results} result{metadata.returned_results !== 1 ? 's' : ''}
                  {metadata.total_results && metadata.total_results !== metadata.returned_results && (
                    <span> of {metadata.total_results}</span>
                  )}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Results tabs */}
        <Tabs value={state.currentTab} onValueChange={(tab) => setState(prev => ({ ...prev, currentTab: tab }))}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({state.articles.length})
            </TabsTrigger>
            <TabsTrigger value="pubmed">
              PubMed ({state.articles.filter(a => a.source === 'pubmed').length})
            </TabsTrigger>
            <TabsTrigger value="scholar">
              Scholar ({state.articles.filter(a => a.source === 'scholar').length})
            </TabsTrigger>
            <TabsTrigger value="featured">
              Featured ({state.articles.filter(a => a.extracted_features).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={state.currentTab} className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleExtractFeatures}
                  disabled={state.isExtracting || filteredArticles.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {state.isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Extracting...
                    </>
                  ) : (
                    'Extract Features'
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <UnifiedArticleCard
                  key={article.id}
                  article={article}
                  index={index + 1}
                  showExtractedFeatures={true}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <WorkbenchHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search Controls */}
        <UnifiedSearchControls
          searchParams={state.searchParams}
          selectedProviders={state.selectedProviders}
          searchMode={state.searchMode}
          isSearching={state.isSearching}
          onSearchParamsChange={(params) => setState(prev => ({ ...prev, searchParams: params }))}
          onSelectedProvidersChange={(providers) => setState(prev => ({ ...prev, selectedProviders: providers }))}
          onSearchModeChange={(mode) => setState(prev => ({ ...prev, searchMode: mode }))}
          onSearch={handleSearch}
          onBatchSearch={handleBatchSearch}
        />

        {/* Results */}
        {renderResults()}
      </div>
    </div>
  );
}

// Helper functions
function filterArticlesByCurrentSettings(
  articles: CanonicalResearchArticle[], 
  filters: UnifiedWorkbenchFilters, 
  currentTab: string
): CanonicalResearchArticle[] {
  let filtered = articles;

  // Filter by tab
  switch (currentTab) {
    case 'pubmed':
      filtered = filtered.filter(a => a.source === 'pubmed');
      break;
    case 'scholar':
      filtered = filtered.filter(a => a.source === 'scholar');
      break;
    case 'featured':
      filtered = filtered.filter(a => a.extracted_features);
      break;
    // 'all' shows everything
  }

  // Apply other filters
  filtered = filtered.filter(article => {
    // Source filter
    if (!filters.sources.includes(article.source)) return false;
    
    // PDF filter
    if (filters.has_pdf && !article.pdf_url) return false;
    
    // DOI filter
    if (filters.has_doi && !article.doi) return false;
    
    // Relevance score filter
    if (article.relevance_score !== undefined && article.relevance_score < filters.min_relevance_score) return false;
    
    // Feature-based filters (if features exist)
    if (article.extracted_features) {
      const features = article.extracted_features;
      
      // Confidence filter
      if (features.confidence_score !== undefined && features.confidence_score < filters.min_confidence) return false;
      
      // Provider-specific filters would go here
    }
    
    return true;
  });

  return filtered;
}

function groupArticlesByProvider(articles: CanonicalResearchArticle[]): Record<string, CanonicalResearchArticle[]> {
  return articles.reduce((acc, article) => {
    const provider = article.source;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(article);
    return acc;
  }, {} as Record<string, CanonicalResearchArticle[]>);
}