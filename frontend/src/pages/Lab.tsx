import { useState, useEffect } from 'react';
import { googleScholarApi, GoogleScholarSearchRequest } from '@/lib/api/googleScholarApi';
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
    const [connectionStatus, setConnectionStatus] = useState<{
        status: 'success' | 'error' | 'unknown';
        message: string;
        api_configured: boolean;
    }>({ status: 'unknown', message: '', api_configured: false });
    const { toast } = useToast();

    // Test connection on mount
    useEffect(() => {
        testConnection();
    }, []);

    const testConnection = async () => {
        try {
            const result = await googleScholarApi.testConnection();
            setConnectionStatus(result);
            if (result.status === 'error') {
                toast({
                    title: 'Connection Issue',
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            setConnectionStatus({
                status: 'error',
                message: error instanceof Error ? error.message : 'Failed to test connection',
                api_configured: false
            });
        }
    };

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
            toast({
                title: 'Search Failed',
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="flex-shrink-0 border-b-2 border-gray-200 dark:border-gray-700 p-4">
                <h1 className="text-2xl font-bold mb-2">Google Scholar Search Lab</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm">Connection Status:</span>
                    <span className={`text-sm font-medium ${connectionStatus.status === 'success' ? 'text-green-600' :
                            connectionStatus.status === 'error' ? 'text-red-600' :
                                'text-gray-600'
                        }`}>
                        {connectionStatus.message || 'Unknown'}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={testConnection}
                    >
                        Test Connection
                    </Button>
                </div>
            </div>

            {/* Search Controls */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-1">Search Query</label>
                        <Input
                            value={searchParams.query}
                            onChange={(e) => setSearchParams({ ...searchParams, query: e.target.value })}
                            placeholder="Enter search terms..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Number of Results</label>
                        <Input
                            type="number"
                            min="1"
                            max="20"
                            value={searchParams.num_results}
                            onChange={(e) => setSearchParams({
                                ...searchParams,
                                num_results: parseInt(e.target.value) || 10
                            })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Sort By</label>
                        <select
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Year From (Optional)</label>
                        <Input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={searchParams.year_low || ''}
                            onChange={(e) => setSearchParams({
                                ...searchParams,
                                year_low: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="e.g., 2020"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Year To (Optional)</label>
                        <Input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={searchParams.year_high || ''}
                            onChange={(e) => setSearchParams({
                                ...searchParams,
                                year_high: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            placeholder="e.g., 2024"
                        />
                    </div>
                </div>
                <Button
                    className="mt-4"
                    onClick={handleSearch}
                    disabled={loading || !searchParams.query.trim()}
                >
                    {loading ? 'Searching...' : 'Search'}
                </Button>
            </div>

            {/* Results Section */}
            <div className="flex-1 overflow-auto p-4">
                {/* Metadata Display */}
                {Object.keys(metadata).length > 0 && (
                    <Card className="mb-4 p-4">
                        <h3 className="font-semibold mb-2">Search Metadata</h3>
                        <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </Card>
                )}

                {/* Articles Display */}
                {articles.length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Results ({articles.length})</h3>
                        {articles.map((article, index) => (
                            <Card key={index} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-lg flex-1">
                                        {article.link ? (
                                            <a
                                                href={article.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {article.title}
                                            </a>
                                        ) : (
                                            article.title
                                        )}
                                    </h4>
                                    <span className="text-sm text-gray-500 ml-2">#{article.position}</span>
                                </div>

                                {article.authors.length > 0 && (
                                    <p className="text-sm text-gray-600 mb-1">
                                        {article.authors.join(', ')}
                                    </p>
                                )}

                                {article.publication_info && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        {article.publication_info}
                                        {article.year && ` (${article.year})`}
                                    </p>
                                )}

                                {article.snippet && (
                                    <p className="text-sm mb-2">{article.snippet}</p>
                                )}

                                <div className="flex flex-wrap gap-2 mt-2">
                                    {article.pdf_link && (
                                        <a
                                            href={article.pdf_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                                        >
                                            PDF
                                        </a>
                                    )}
                                    {article.cited_by_count !== undefined && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                            Cited by {article.cited_by_count}
                                        </span>
                                    )}
                                    {article.cited_by_link && (
                                        <a
                                            href={article.cited_by_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                                        >
                                            View Citations
                                        </a>
                                    )}
                                    {article.related_pages_link && (
                                        <a
                                            href={article.related_pages_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                                        >
                                            Related
                                        </a>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        {loading ? 'Searching...' : 'No results to display. Try searching for something!'}
                    </div>
                )}
            </div>
        </div>
    );
}

