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
    const { toast } = useToast();

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
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Results ({articles.length})</h3>
                            <Button
                                onClick={handleExtract}
                                disabled={extracting || articles.length === 0}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-medium"
                            >
                                {extracting ? 'Extracting...' : 'Extract Features'}
                            </Button>
                        </div>
                        {articles.map((article, index) => (
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

