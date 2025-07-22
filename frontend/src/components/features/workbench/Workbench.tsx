import { useState } from 'react';
import { googleScholarApi } from '@/lib/api/googleScholarApi';
import { extractApi } from '@/lib/api/extractApi';
import { CanonicalScholarArticle } from '@/types/canonical_types';
import { useToast } from '@/components/ui/use-toast';
import WorkbenchHeader from './WorkbenchHeader';
import SearchControls from './search/SearchControls';
import SearchFilters from './search/SearchFilters';
import MetadataDisplay from './results/MetadataDisplay';
import ResultsList from './results/ResultsList';
import { WorkbenchState, WorkbenchFilters, SortOption } from './search/types';
import { DEFAULT_FILTERS } from './utils/constants';
import { filterArticles, sortArticles } from './utils/filterUtils';

export default function Workbench() {
    const [state, setState] = useState<WorkbenchState>({
        searchParams: {
            query: '',
            num_results: 10,
            sort_by: 'relevance'
        },
        articles: [],
        metadata: {},
        loading: false,
        extracting: false,
        extractionMetadata: null,
        filters: DEFAULT_FILTERS,
        showFilters: false,
        sortBy: 'none'
    });

    const { toast } = useToast();

    // Apply filters and sorting
    const filteredArticles = filterArticles(state.articles, state.filters);
    const sortedAndFilteredArticles = sortArticles(filteredArticles, state.sortBy);

    const handleSearch = async () => {
        if (!state.searchParams.query.trim()) {
            toast({
                title: 'Error',
                description: 'Please enter a search query',
                variant: 'destructive'
            });
            return;
        }

        setState(prev => ({ ...prev, loading: true }));
        try {
            const response = await googleScholarApi.search(state.searchParams);
            setState(prev => ({
                ...prev,
                articles: response.articles,
                metadata: response.metadata,
                loading: false,
                // Reset extraction state on new search
                extractionMetadata: null,
                filters: DEFAULT_FILTERS,
                showFilters: false,
                sortBy: 'none'
            }));
            toast({
                title: 'Search Complete',
                description: `Found ${response.articles.length} articles`,
            });
        } catch (error) {
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
                // Check for specific error about API key
                if (errorMessage.includes('SerpAPI key not configured')) {
                    errorMessage = 'Google Scholar search requires a SerpAPI key. Please set the SERPAPI_KEY environment variable.';
                }
            }
            toast({
                title: 'Search Failed',
                description: errorMessage,
                variant: 'destructive'
            });
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleExtract = async () => {
        if (state.articles.length === 0) {
            toast({
                title: 'Error',
                description: 'No articles to extract features from',
                variant: 'destructive'
            });
            return;
        }

        setState(prev => ({ ...prev, extracting: true }));
        try {
            const response = await extractApi.extractScholarFeatures({
                articles: state.articles
            });

            // Update articles with extracted features
            const enrichedArticles = response.results.map(result => result.enriched_article);
            setState(prev => ({
                ...prev,
                articles: enrichedArticles,
                extractionMetadata: response.metadata,
                extracting: false
            }));

            toast({
                title: 'Extraction Complete',
                description: `Extracted features from ${response.metadata.successful_extractions} articles`,
            });
        } catch (error) {
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            toast({
                title: 'Extraction Failed',
                description: errorMessage,
                variant: 'destructive'
            });
            setState(prev => ({ ...prev, extracting: false }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            <WorkbenchHeader />

            <SearchControls
                searchParams={state.searchParams}
                loading={state.loading}
                onSearchParamsChange={(searchParams) => setState(prev => ({ ...prev, searchParams }))}
                onSearch={handleSearch}
            />

            {/* Filter Controls (shown after extraction) */}
            {state.extractionMetadata && (
                <SearchFilters
                    filters={state.filters}
                    showFilters={state.showFilters}
                    sortBy={state.sortBy}
                    articlesCount={state.articles.length}
                    filteredCount={sortedAndFilteredArticles.length}
                    onFiltersChange={(filters) => setState(prev => ({ ...prev, filters }))}
                    onShowFiltersChange={(showFilters) => setState(prev => ({ ...prev, showFilters }))}
                    onSortByChange={(sortBy) => setState(prev => ({ ...prev, sortBy }))}
                    onResetFilters={() => setState(prev => ({ ...prev, filters: DEFAULT_FILTERS }))}
                />
            )}

            {/* Results Section */}
            <div className="flex-1 overflow-auto p-4">
                <MetadataDisplay
                    searchMetadata={state.metadata}
                    extractionMetadata={state.extractionMetadata}
                />

                {/* Articles Display */}
                {state.loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        Searching...
                    </div>
                ) : (
                    <ResultsList
                        articles={sortedAndFilteredArticles}
                        extracting={state.extracting}
                        onExtract={handleExtract}
                    />
                )}
            </div>
        </div>
    );
} 