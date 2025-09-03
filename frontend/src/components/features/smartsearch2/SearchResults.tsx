import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    ExternalLink,
    Edit,
    Search,
    Grid,
    List,
    Table,
    Plus,
    Sparkles,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronDown,
    ChevronRight,
    Filter,
    X,
    Check
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import type { CanonicalResearchArticle } from '@/types/canonical_types';
import type { SearchPaginationInfo } from '@/types/smart-search';
import type { FeatureDefinition } from '@/types/workbench';
import { generatePrefixedUUID } from '@/lib/utils/uuid';


interface SearchResultsProps {
    articles: CanonicalResearchArticle[];
    pagination: SearchPaginationInfo;
    query: string;
    source: 'pubmed' | 'google_scholar';
    isSearching: boolean;
    onQueryUpdate: (newQuery: string) => void;
    onSearch: () => void;
    onLoadMore?: () => void;
}

export function SearchResults({
    articles,
    pagination,
    query,
    source,
    isSearching,
    onQueryUpdate,
    onSearch,
    onLoadMore
}: SearchResultsProps) {
    const { toast } = useToast();

    // UI State
    const [isEditingQuery, setIsEditingQuery] = useState(false);
    const [editedQuery, setEditedQuery] = useState(query);
    const [displayMode, setDisplayMode] = useState<'table' | 'card-compressed' | 'card-full'>('card-compressed');

    // AI Columns State
    const [showColumns, setShowColumns] = useState(false);
    const [appliedFeatures, setAppliedFeatures] = useState<FeatureDefinition[]>([]);
    const [pendingFeatures, setPendingFeatures] = useState<FeatureDefinition[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedData, setExtractedData] = useState<Record<string, Record<string, any>>>({});

    const [newFeature, setNewFeature] = useState<FeatureDefinition>({
        id: '',
        name: '',
        description: '',
        type: 'text'
    });

    // Sorting and filtering
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [showFilters, setShowFilters] = useState(false);

    // Update edited query when prop changes
    useEffect(() => {
        setEditedQuery(query);
    }, [query]);

    const handleQueryEdit = () => {
        if (isEditingQuery) {
            if (editedQuery.trim() !== query.trim()) {
                onQueryUpdate(editedQuery.trim());
                onSearch();
            }
            setIsEditingQuery(false);
        } else {
            setIsEditingQuery(true);
        }
    };

    const handleCancelEdit = () => {
        setEditedQuery(query);
        setIsEditingQuery(false);
    };

    // AI Columns functionality
    const handleAddFeature = () => {
        if (!newFeature.name.trim() || !newFeature.description.trim()) {
            toast({
                title: 'Invalid Feature',
                description: 'Please provide both name and description',
                variant: 'destructive'
            });
            return;
        }

        const feature: FeatureDefinition = {
            ...newFeature,
            id: generatePrefixedUUID('feat')
        };

        setPendingFeatures([...pendingFeatures, feature]);
        setNewFeature({
            id: '',
            name: '',
            description: '',
            type: 'text'
        });
    };

    const handleRemovePendingFeature = (featureId: string) => {
        setPendingFeatures(pendingFeatures.filter(f => f.id !== featureId));
    };

    const handleExtractFeatures = async () => {
        if (pendingFeatures.length === 0) {
            toast({
                title: 'No Features',
                description: 'Add some features to extract first',
                variant: 'destructive'
            });
            return;
        }

        setIsExtracting(true);
        try {
            // Since SmartSearch2 doesn't have sessions, we'll need to implement a simpler extraction
            // For now, we'll simulate the extraction with mock data
            toast({
                title: 'Feature Extraction',
                description: 'AI column extraction is not yet implemented for SmartSearch2',
                variant: 'default'
            });

            // Move pending features to applied
            setAppliedFeatures([...appliedFeatures, ...pendingFeatures]);
            setPendingFeatures([]);

        } catch (error) {
            toast({
                title: 'Extraction Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIsExtracting(false);
        }
    };

    // Sorting functionality
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortedArticles = () => {
        if (!sortColumn) return articles;

        return [...articles].sort((a, b) => {
            let aVal = '';
            let bVal = '';

            switch (sortColumn) {
                case 'title':
                    aVal = a.title || '';
                    bVal = b.title || '';
                    break;
                case 'year':
                    aVal = a.publication_year?.toString() || '';
                    bVal = b.publication_year?.toString() || '';
                    break;
                case 'authors':
                    aVal = a.authors?.join(', ') || '';
                    bVal = b.authors?.join(', ') || '';
                    break;
                case 'journal':
                    aVal = a.journal || '';
                    bVal = b.journal || '';
                    break;
                default:
                    return 0;
            }

            const comparison = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    };

    const sortedArticles = getSortedArticles();

    const renderTableView = () => (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                            <button
                                onClick={() => handleSort('title')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                Title
                                {sortColumn === 'title' && (
                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                )}
                            </button>
                        </th>
                        <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                            <button
                                onClick={() => handleSort('authors')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                Authors
                                {sortColumn === 'authors' && (
                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                )}
                            </button>
                        </th>
                        <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                            <button
                                onClick={() => handleSort('year')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                Year
                                {sortColumn === 'year' && (
                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                )}
                            </button>
                        </th>
                        <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                            <button
                                onClick={() => handleSort('journal')}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                Journal
                                {sortColumn === 'journal' && (
                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                )}
                            </button>
                        </th>
                        {appliedFeatures.map(feature => (
                            <th key={feature.id} className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">
                                {feature.name}
                            </th>
                        ))}
                        <th className="text-left p-3 font-medium text-gray-900 dark:text-gray-100">Link</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedArticles.map((article, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                                {article.title}
                            </td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                {article.authors?.slice(0, 2).join(', ')}
                                {article.authors && article.authors.length > 2 && ' et al.'}
                            </td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                {article.publication_year}
                            </td>
                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                {article.journal}
                            </td>
                            {appliedFeatures.map(feature => (
                                <td key={feature.id} className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                    {extractedData[article.id]?.[feature.id] || '-'}
                                </td>
                            ))}
                            <td className="p-3">
                                {article.url && (
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCardView = (compressed: boolean = true) => (
        <div className={`space-y-${compressed ? '3' : '4'}`}>
            {sortedArticles.map((article, index) => (
                <div
                    key={index}
                    className={`border border-gray-200 dark:border-gray-700 rounded-lg ${compressed ? 'p-4' : 'p-6'} hover:bg-gray-50 dark:hover:bg-gray-800`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-gray-900 dark:text-white ${compressed ? 'mb-2' : 'mb-3'}`}>
                                {article.title || 'Untitled'}
                            </h4>
                            <p className={`text-sm text-gray-600 dark:text-gray-400 ${compressed ? 'mb-2' : 'mb-3'}`}>
                                {article.authors?.slice(0, 3).join(', ')}
                                {article.authors && article.authors.length > 3 && ' et al.'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                {article.journal && <span>{article.journal}</span>}
                                {article.publication_year && <span>{article.publication_year}</span>}
                                <Badge variant="outline" className="text-xs">
                                    {source === 'pubmed' ? 'PubMed' : 'Google Scholar'}
                                </Badge>
                            </div>

                            {!compressed && article.abstract && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-3">
                                    {article.abstract}
                                </p>
                            )}

                            {appliedFeatures.length > 0 && (
                                <div className={`${compressed ? 'mt-2' : 'mt-4'} space-y-1`}>
                                    {appliedFeatures.map(feature => (
                                        <div key={feature.id} className="flex items-center gap-2 text-xs">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{feature.name}:</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {extractedData[article.id]?.[feature.id] || '-'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {article.url && (
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0"
                                title="View article"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Search Header with Query Editing */}
            <Card className="p-4">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                Search Results
                            </h2>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Source: <Badge variant="outline">{source === 'pubmed' ? 'PubMed' : 'Google Scholar'}</Badge>
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Total Available: <strong className="text-gray-900 dark:text-white">{pagination.total_available.toLocaleString()}</strong>
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    Retrieved: <strong className="text-gray-900 dark:text-white">{articles.length.toLocaleString()}</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Query Display/Edit */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Search Query</Label>
                        {isEditingQuery ? (
                            <div className="flex gap-2">
                                <Textarea
                                    value={editedQuery}
                                    onChange={(e) => setEditedQuery(e.target.value)}
                                    rows={3}
                                    className="flex-1 font-mono text-sm"
                                />
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={handleQueryEdit}
                                        disabled={isSearching || !editedQuery.trim()}
                                        size="sm"
                                        className="whitespace-nowrap"
                                    >
                                        {isSearching ? (
                                            <>
                                                <div className="animate-spin mr-2 h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                                                Searching...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-3 h-3 mr-2" />
                                                Search
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleCancelEdit}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2">
                                <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                                    <code className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                        {query}
                                    </code>
                                </div>
                                <Button
                                    onClick={handleQueryEdit}
                                    variant="outline"
                                    size="sm"
                                    className="flex-shrink-0"
                                >
                                    <Edit className="w-3 h-3 mr-2" />
                                    Edit
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* View Controls and AI Columns */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Label className="text-sm font-medium">View:</Label>
                        <div className="flex items-center gap-1">
                            <Button
                                variant={displayMode === 'table' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDisplayMode('table')}
                            >
                                <Table className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={displayMode === 'card-compressed' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDisplayMode('card-compressed')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={displayMode === 'card-full' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDisplayMode('card-full')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColumns(!showColumns)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        AI Columns
                    </Button>
                </div>

                {/* AI Columns Panel */}
                <Collapsible open={showColumns} onOpenChange={setShowColumns}>
                    <CollapsibleContent>
                        <div className="border-t pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-sm">Feature Name</Label>
                                    <Input
                                        value={newFeature.name}
                                        onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                                        placeholder="e.g., Study Type"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm">Type</Label>
                                    <Select
                                        value={newFeature.type}
                                        onValueChange={(value: any) => setNewFeature({ ...newFeature, type: value })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="boolean">Yes/No</SelectItem>
                                            <SelectItem value="score">Score (1-10)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-sm">Description</Label>
                                    <Input
                                        value={newFeature.description}
                                        onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                                        placeholder="What should be extracted from each article?"
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleAddFeature}
                                    size="sm"
                                    disabled={!newFeature.name.trim() || !newFeature.description.trim()}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Feature
                                </Button>

                                {pendingFeatures.length > 0 && (
                                    <Button
                                        onClick={handleExtractFeatures}
                                        disabled={isExtracting}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isExtracting ? (
                                            <>
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                Extracting...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Extract ({pendingFeatures.length})
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {pendingFeatures.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Pending Features:</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {pendingFeatures.map(feature => (
                                            <Badge key={feature.id} variant="secondary" className="flex items-center gap-1">
                                                {feature.name}
                                                <button
                                                    onClick={() => handleRemovePendingFeature(feature.id)}
                                                    className="ml-1 hover:text-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </Card>

            {/* Results Display */}
            <Card className="p-6">
                {isSearching ? (
                    <div className="text-center py-12">
                        <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Searching...</p>
                    </div>
                ) : articles.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Retrieved Articles ({articles.length.toLocaleString()})
                            </h3>
                            {pagination.has_more && onLoadMore && (
                                <Button
                                    onClick={onLoadMore}
                                    variant="outline"
                                    size="sm"
                                >
                                    Load More
                                </Button>
                            )}
                        </div>

                        {displayMode === 'table' && renderTableView()}
                        {displayMode === 'card-compressed' && renderCardView(true)}
                        {displayMode === 'card-full' && renderCardView(false)}

                        {pagination.has_more && (
                            <div className="text-center pt-4 border-t">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    Showing {articles.length.toLocaleString()} of {pagination.total_available.toLocaleString()} total articles
                                </p>
                                {onLoadMore && (
                                    <Button
                                        onClick={onLoadMore}
                                        variant="outline"
                                    >
                                        Load More Articles
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <p>No results found</p>
                        <p className="text-sm mt-2">Try adjusting your search terms</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
