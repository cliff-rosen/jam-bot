import { useState } from 'react';
import { googleScholarApi, GoogleScholarSearchRequest } from '@/lib/api/googleScholarApi';
import { extractApi } from '@/lib/api/extractApi';
import { CanonicalScholarArticle } from '@/types/canonical_types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function LabPage() {
    const [searchParams, setSearchParams] = useState<GoogleScholarSearchRequest>({
        query: '',
        num_results: 10,
        sort_by: 'relevance'
    });
    const [articles, setArticles] = useState<CanonicalScholarArticle[]>([]);
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [extractionMetadata, setExtractionMetadata] = useState<Record<string, any> | null>(null);
    
    // Filter state
    const [filters, setFilters] = useState({
        poi_relevance: 'all' as 'all' | 'yes' | 'no',
        doi_relevance: 'all' as 'all' | 'yes' | 'no',
        is_systematic: 'all' as 'all' | 'yes' | 'no',
        study_type: 'all' as 'all' | 'human RCT' | 'human non-RCT' | 'non-human life science' | 'non life science' | 'not a study',
        study_outcome: 'all' as 'all' | 'effectiveness' | 'safety' | 'diagnostics' | 'biomarker' | 'other',
        min_confidence: 0
    });
    const [showFilters, setShowFilters] = useState(false);
    
    const { toast } = useToast();

    // Filter articles based on extracted features
    const filteredArticles = articles.filter(article => {
        // If no features extracted yet, show all articles
        if (!article.metadata?.features) {
            return true;
        }

        const features = article.metadata.features;

        // Apply filters
        if (filters.poi_relevance !== 'all' && features.poi_relevance !== filters.poi_relevance) {
            return false;
        }
        if (filters.doi_relevance !== 'all' && features.doi_relevance !== filters.doi_relevance) {
            return false;
        }
        if (filters.is_systematic !== 'all' && features.is_systematic !== filters.is_systematic) {
            return false;
        }
        if (filters.study_type !== 'all' && features.study_type !== filters.study_type) {
            return false;
        }
        if (filters.study_outcome !== 'all' && features.study_outcome !== filters.study_outcome) {
            return false;
        }
        if (features.confidence_score < filters.min_confidence / 100) {
            return false;
        }

        return true;
    });

    const handleSearch = async () => {
        if (!searchParams.query.trim()) {
            toast({
                title: 'Error',
                description: 'Please enter a search query',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await googleScholarApi.search(searchParams);
            setArticles(response.articles);
            setMetadata(response.metadata);
            // Reset extraction state on new search
            setExtractionMetadata(null);
            setFilters({
                poi_relevance: 'all',
                doi_relevance: 'all',
                is_systematic: 'all',
                study_type: 'all',
                study_outcome: 'all',
                min_confidence: 0
            });
            setShowFilters(false);
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
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async () => {
        if (articles.length === 0) {
            toast({
                title: 'Error',
                description: 'No articles to extract features from',
                variant: 'destructive'
            });
            return;
        }

        setExtracting(true);
        try {
            const response = await extractApi.extractScholarFeatures({
                articles: articles
            });
            
            // Update articles with extracted features
            const enrichedArticles = response.results.map(result => result.enriched_article);
            setArticles(enrichedArticles);
            setExtractionMetadata(response.metadata);
            
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
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 p-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Google Scholar Search Lab</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Note: This requires a SerpAPI key to be configured in the backend (SERPAPI_KEY environment variable)
                </p>
            </div>

            {/* Search Controls */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto">
                    {/* Main search row */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Search Query</label>
                            <Input
                                value={searchParams.query}
                                onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                                placeholder="Enter search terms..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <Button
                            className="px-8 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium"
                            onClick={handleSearch}
                            disabled={loading || !searchParams.query.trim()}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>

                    {/* Advanced options row */}
                    <div className="mt-4 flex flex-wrap gap-3">
                        <div className="w-32">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Results</label>
                            <Input
                                type="number"
                                min="1"
                                max="20"
                                value={searchParams.num_results}
                                onChange={(e) => setSearchParams({
                                    ...searchParams,
                                    num_results: parseInt(e.target.value) || 10
                                })}
                                className="dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div className="w-40">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sort By</label>
                            <select
                                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                value={searchParams.sort_by}
                                onChange={(e) => setSearchParams({
                                    ...searchParams,
                                    sort_by: e.target.value as 'relevance' | 'date'
                                })}
                            >
                                <option value="relevance">Relevance</option>
                                <option value="date">Date</option>
                            </select>
                        </div>
                        <div className="w-28">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">From Year</label>
                            <Input
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={searchParams.year_low || ''}
                                onChange={(e) => setSearchParams({
                                    ...searchParams,
                                    year_low: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                                placeholder="2020"
                                className="dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                        <div className="w-28">
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">To Year</label>
                            <Input
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={searchParams.year_high || ''}
                                onChange={(e) => setSearchParams({
                                    ...searchParams,
                                    year_high: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                                placeholder="2024"
                                className="dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Controls (shown after extraction) */}
            {extractionMetadata && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Results</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="dark:border-gray-600 dark:text-gray-300"
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>
                        </div>
                        
                        {showFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                                {/* PoI Relevance Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">PoI Relevance</label>
                                    <select
                                        value={filters.poi_relevance}
                                        onChange={(e) => setFilters({ ...filters, poi_relevance: e.target.value as any })}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="all">All</option>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                {/* DoI Relevance Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">DoI Relevance</label>
                                    <select
                                        value={filters.doi_relevance}
                                        onChange={(e) => setFilters({ ...filters, doi_relevance: e.target.value as any })}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="all">All</option>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                {/* Systematic Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Systematic</label>
                                    <select
                                        value={filters.is_systematic}
                                        onChange={(e) => setFilters({ ...filters, is_systematic: e.target.value as any })}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="all">All</option>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                {/* Study Type Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Study Type</label>
                                    <select
                                        value={filters.study_type}
                                        onChange={(e) => setFilters({ ...filters, study_type: e.target.value as any })}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="all">All</option>
                                        <option value="human RCT">Human RCT</option>
                                        <option value="human non-RCT">Human non-RCT</option>
                                        <option value="non-human life science">Non-human life science</option>
                                        <option value="non life science">Non life science</option>
                                        <option value="not a study">Not a study</option>
                                    </select>
                                </div>

                                {/* Study Outcome Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Study Outcome</label>
                                    <select
                                        value={filters.study_outcome}
                                        onChange={(e) => setFilters({ ...filters, study_outcome: e.target.value as any })}
                                        className="w-full px-2 py-1 border rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                    >
                                        <option value="all">All</option>
                                        <option value="effectiveness">Effectiveness</option>
                                        <option value="safety">Safety</option>
                                        <option value="diagnostics">Diagnostics</option>
                                        <option value="biomarker">Biomarker</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                {/* Confidence Filter */}
                                <div>
                                    <label className="block font-medium mb-1 text-gray-700 dark:text-gray-300">Min Confidence %</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        value={filters.min_confidence}
                                        onChange={(e) => setFilters({ ...filters, min_confidence: parseInt(e.target.value) })}
                                        className="w-full"
                                    />
                                    <div className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1">
                                        {filters.min_confidence}%
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Filter summary */}
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            Showing {filteredArticles.length} of {articles.length} articles
                            {filteredArticles.length !== articles.length && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => setFilters({
                                        poi_relevance: 'all',
                                        doi_relevance: 'all',
                                        is_systematic: 'all',
                                        study_type: 'all',
                                        study_outcome: 'all',
                                        min_confidence: 0
                                    })}
                                    className="ml-2 h-auto p-0 text-blue-600 dark:text-blue-400"
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Results Section */}
            <div className="flex-1 overflow-auto p-4">
                {/* Metadata Display */}
                {Object.keys(metadata).length > 0 && (
                    <Card className="mb-4 p-4 dark:bg-gray-800">
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Search Metadata</h3>
                        <pre className="text-sm bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2 rounded overflow-auto">
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </Card>
                )}

                {/* Extraction Metadata Display */}
                {extractionMetadata && (
                    <Card className="mb-4 p-4 dark:bg-gray-800">
                        <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Feature Extraction Results</h3>
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <p>Articles Processed: {extractionMetadata.articles_processed}</p>
                            <p>Successful Extractions: {extractionMetadata.successful_extractions}</p>
                            <p>Failed Extractions: {extractionMetadata.failed_extractions}</p>
                        </div>
                    </Card>
                )}

                {/* Articles Display */}
                {articles.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Results ({filteredArticles.length})</h3>
                            <Button
                                onClick={handleExtract}
                                disabled={extracting || articles.length === 0}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium"
                            >
                                {extracting ? 'Extracting...' : 'Extract Features'}
                            </Button>
                        </div>
                        {filteredArticles.map((article, index) => (
                            <Card key={index} className="p-4 dark:bg-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-lg flex-1">
                                        {article.link ? (
                                            <a
                                                href={article.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {article.title}
                                            </a>
                                        ) : (
                                            <span className="text-gray-900 dark:text-gray-100">{article.title}</span>
                                        )}
                                    </h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">#{article.position}</span>
                                </div>

                                {article.authors.length > 0 && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {article.authors.join(', ')}
                                    </p>
                                )}

                                {article.publication_info && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {article.publication_info}
                                        {article.year && ` (${article.year})`}
                                    </p>
                                )}

                                {article.snippet && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{article.snippet}</p>
                                )}

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {article.pdf_link && (
                                        <a
                                            href={article.pdf_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800"
                                        >
                                            PDF
                                        </a>
                                    )}
                                    {article.cited_by_count !== undefined && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                            Cited by {article.cited_by_count}
                                        </span>
                                    )}
                                    {article.cited_by_link && (
                                        <a
                                            href={article.cited_by_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            View Citations
                                        </a>
                                    )}
                                    {article.related_pages_link && (
                                        <a
                                            href={article.related_pages_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            Related
                                        </a>
                                    )}
                                </div>

                                {/* Display extracted features if available */}
                                {article.metadata?.features && (
                                    <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-600">
                                        <h5 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Extracted Features</h5>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="space-y-1">
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">PoI Relevance: </span>
                                                    <span className={`px-1 py-0.5 rounded ${
                                                        article.metadata.features.poi_relevance === 'yes' 
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {article.metadata.features.poi_relevance}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">DoI Relevance: </span>
                                                    <span className={`px-1 py-0.5 rounded ${
                                                        article.metadata.features.doi_relevance === 'yes' 
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {article.metadata.features.doi_relevance}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Systematic: </span>
                                                    <span className={`px-1 py-0.5 rounded ${
                                                        article.metadata.features.is_systematic === 'yes' 
                                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {article.metadata.features.is_systematic}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Study Type: </span>
                                                    <span className="text-gray-700 dark:text-gray-300">{article.metadata.features.study_type}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Outcome: </span>
                                                    <span className="text-gray-700 dark:text-gray-300">{article.metadata.features.study_outcome}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Confidence: </span>
                                                    <span className={`px-1 py-0.5 rounded ${
                                                        article.metadata.features.confidence_score >= 0.8
                                                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                                            : article.metadata.features.confidence_score >= 0.6
                                                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                                            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                                    }`}>
                                                        {(article.metadata.features.confidence_score * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {article.metadata.features.extraction_notes && (
                                            <div className="mt-2">
                                                <span className="font-medium text-gray-600 dark:text-gray-400">Notes: </span>
                                                <span className="text-xs text-gray-600 dark:text-gray-400">{article.metadata.features.extraction_notes}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Display extraction error if available */}
                                {article.metadata?.feature_extraction_error && (
                                    <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-600">
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                                            <span className="text-sm font-medium text-red-800 dark:text-red-200">Extraction Error: </span>
                                            <span className="text-sm text-red-700 dark:text-red-300">{article.metadata.feature_extraction_error}</span>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        {loading ? 'Searching...' : 'No results to display. Try searching for something!'}
                    </div>
                )}
            </div>
        </div>
    );
}

