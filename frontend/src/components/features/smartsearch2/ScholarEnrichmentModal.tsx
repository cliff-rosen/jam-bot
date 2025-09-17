import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    BookOpen,
    Sparkles,
    Search,
    AlertCircle,
    CheckCircle,
    X,
    ArrowLeft,
    ExternalLink
} from 'lucide-react';

import { useSmartSearch2 } from '@/context/SmartSearch2Context';
import { smartSearch2Api } from '@/lib/api/smartSearch2Api';
import type { SmartSearchArticle } from '@/types/smart-search';
import type { CanonicalResearchArticle } from '@/types/canonical_types';

// Max number of Google Scholar results to browse in this modal
const SCHOLAR_BROWSE_MAX = 100;

interface ScholarEnrichmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddArticles: (articles: SmartSearchArticle[]) => void;
}

type EnrichmentStep =
    | 'keywords'       // User enters/AI suggests keywords
    | 'browse'         // Browse Scholar results (up to SCHOLAR_BROWSE_MAX)
    | 'filtering'      // User filtering Scholar results
    | 'complete';      // Done

export function ScholarEnrichmentModal({
    isOpen,
    onClose,
    onAddArticles
}: ScholarEnrichmentModalProps) {
    const {
        evidenceSpec,
        extractedConcepts,
        generateScholarKeywords,
        testScholarKeywords,
        searchScholar
    } = useSmartSearch2();

    const [currentStep, setCurrentStep] = useState<EnrichmentStep>('keywords');
    const [editedKeywords, setEditedKeywords] = useState('');
    const [scholarArticles, setScholarArticles] = useState<SmartSearchArticle[]>([]); // All Scholar results (includes duplicates marked with isDuplicate flag)
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
    const [isTestingKeywords, setIsTestingKeywords] = useState(false);
    const [testResultCount, setTestResultCount] = useState<number | null>(null);
    const [filterCriteria, setFilterCriteria] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filterError, setFilterError] = useState<string | null>(null);

    // Reset flow and initialize filter criteria when modal opens
    React.useEffect(() => {
        if (isOpen) {
            // Reset the entire flow to start fresh
            setCurrentStep('keywords');
            setEditedKeywords('');
            setScholarArticles([]);
            setIsProcessing(false);
            setIsGeneratingKeywords(false);
            setIsTestingKeywords(false);
            setTestResultCount(null);
            setSearchError(null);
            setIsFiltering(false);
            setFilterError(null);

            // Initialize filter criteria
            setFilterCriteria(evidenceSpec || '?');
        }
    }, [isOpen, evidenceSpec]);

    const handleGenerateKeywords = async () => {
        setIsGeneratingKeywords(true);
        try {
            const keywords = await generateScholarKeywords();
            setEditedKeywords(keywords);
        } catch (error) {
            console.error('Failed to generate keywords:', error);
            // Leave keywords empty and let user enter manually
            setEditedKeywords('');
        } finally {
            setIsGeneratingKeywords(false);
        }
    };

    const handleTestKeywords = async () => {
        if (!editedKeywords.trim()) return;

        setIsTestingKeywords(true);
        try {
            const count = await testScholarKeywords(editedKeywords);
            setTestResultCount(count);
        } catch (error) {
            console.error('Error testing keywords:', error);
            // On error, clear the test result
            setTestResultCount(null);
        } finally {
            setIsTestingKeywords(false);
        }
    };

    const handleBrowseResults = async () => {
        setIsProcessing(true);
        setSearchError(null);
        setCurrentStep('browse');

        try {
            const results = await searchScholar(editedKeywords, SCHOLAR_BROWSE_MAX);

            // Ensure unique articles by ID to prevent React key conflicts
            const uniqueResults = results.filter((article, index, arr) =>
                arr.findIndex(a => a.id === article.id) === index
            );

            setScholarArticles(uniqueResults);
        } catch (error) {
            console.error('Error browsing Scholar results:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to search Google Scholar';
            setSearchError(errorMessage);
            setScholarArticles([]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFilterScholarResults = async () => {
        setIsFiltering(true);
        setFilterError(null);

        try {
            // Only filter unique articles (not duplicates)
            const uniqueScholarArticles = scholarArticles.filter(article => !article.isDuplicate);

            if (uniqueScholarArticles.length === 0) {
                throw new Error('No unique articles to filter');
            }

            // Convert Scholar articles to canonical format for filtering
            const canonicalArticles: CanonicalResearchArticle[] = uniqueScholarArticles.map(article => {
                // Build canonical article by copying only the fields that exist in CanonicalResearchArticle
                const canonical: CanonicalResearchArticle = {
                    id: article.id,
                    source: article.source,
                    title: article.title,
                    authors: article.authors || [],
                    keywords: article.keywords || [],
                    mesh_terms: article.mesh_terms || [],
                    categories: article.categories || [],
                };

                // Add optional fields if they exist
                if (article.pmid) canonical.pmid = article.pmid;
                if (article.abstract) canonical.abstract = article.abstract;
                if (article.snippet) canonical.snippet = article.snippet;
                if (article.journal) canonical.journal = article.journal;
                if (article.publication_date) canonical.publication_date = article.publication_date;
                if (article.publication_year !== undefined) canonical.publication_year = article.publication_year;
                if (article.date_completed) canonical.date_completed = article.date_completed;
                if (article.date_revised) canonical.date_revised = article.date_revised;
                if (article.date_entered) canonical.date_entered = article.date_entered;
                if (article.date_published) canonical.date_published = article.date_published;
                if (article.doi) canonical.doi = article.doi;
                if (article.url) canonical.url = article.url;
                if (article.pdf_url) canonical.pdf_url = article.pdf_url;
                if (article.citation_count !== undefined) canonical.citation_count = article.citation_count;
                if (article.cited_by_url) canonical.cited_by_url = article.cited_by_url;
                if (article.related_articles_url) canonical.related_articles_url = article.related_articles_url;
                if (article.versions_url) canonical.versions_url = article.versions_url;
                if (article.search_position !== undefined) canonical.search_position = article.search_position;
                if (article.relevance_score !== undefined) canonical.relevance_score = article.relevance_score;
                if (article.extracted_features) canonical.extracted_features = article.extracted_features;
                if (article.quality_scores) canonical.quality_scores = article.quality_scores;
                if (article.source_metadata) canonical.source_metadata = article.source_metadata;
                if (article.indexed_at) canonical.indexed_at = article.indexed_at;
                if (article.retrieved_at) canonical.retrieved_at = article.retrieved_at;

                return canonical;
            });

            // Call the backend filter endpoint directly
            const filterResponse = await smartSearch2Api.filterArticles({
                filter_condition: filterCriteria,
                articles: canonicalArticles,
                strictness: 'medium'
            });

            // Update Scholar articles with filter results
            const updatedScholarArticles = scholarArticles.map(article => {
                // Keep duplicates unchanged
                if (article.isDuplicate) {
                    return article;
                }

                // Find the corresponding filter result
                const filterResult = filterResponse.filtered_articles.find(fa =>
                    fa.article.url === article.url ||
                    (fa.article.title === article.title && fa.article.authors?.join(',') === article.authors?.join(','))
                );

                return {
                    ...article,
                    filterStatus: filterResult ? {
                        passed: filterResult.passed,
                        confidence: filterResult.confidence,
                        reasoning: filterResult.reasoning
                    } : null
                };
            });

            // Ensure unique articles by ID to prevent React key conflicts
            const uniqueUpdatedArticles = updatedScholarArticles.filter((article, index, arr) =>
                arr.findIndex(a => a.id === article.id) === index
            );

            setScholarArticles(uniqueUpdatedArticles);
            setCurrentStep('complete');

        } catch (error) {
            console.error('Error filtering Scholar results:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to filter Scholar results';
            setFilterError(errorMessage);
        } finally {
            setIsFiltering(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col">
                <DialogTitle className="sr-only">Google Scholar Enrichment</DialogTitle>
                <DialogDescription className="sr-only">
                    Find additional relevant articles from Google Scholar to supplement your PubMed results
                </DialogDescription>

                <div className="pb-4 relative">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Google Scholar Enrichment
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Find additional relevant articles from Google Scholar to supplement your PubMed results
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep === 'keywords' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                            1
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm font-medium ${currentStep === 'keywords' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                Keywords
                            </p>
                        </div>
                    </div>
                    <div className={`flex-1 h-px mx-4 bg-gray-200 dark:bg-gray-700`} />
                    <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep === 'browse' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                            2
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm font-medium ${currentStep === 'browse' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                Browse
                            </p>
                        </div>
                    </div>
                    <div className={`flex-1 h-px mx-4 bg-gray-200 dark:bg-gray-700`} />
                    <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep === 'filtering' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                            3
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm font-medium ${currentStep === 'filtering' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                Filter
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Keywords */}
                    {currentStep === 'keywords' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Search Keywords</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Enter keywords to search Google Scholar, or use AI to suggest keywords based on your PubMed {extractedConcepts?.length > 0 ? 'concept analysis' : 'search results'}.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Search Keywords:</label>
                                        <Textarea
                                            value={editedKeywords}
                                            onChange={(e) => setEditedKeywords(e.target.value)}
                                            className="min-h-[120px] font-mono text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                            placeholder="Enter search keywords for Google Scholar..."
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={handleGenerateKeywords}
                                            disabled={isGeneratingKeywords}
                                            className="flex-1"
                                        >
                                            {isGeneratingKeywords ? (
                                                <>
                                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    AI Suggest Keywords
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleTestKeywords}
                                            disabled={!editedKeywords.trim() || isTestingKeywords}
                                            className="flex-1"
                                        >
                                            {isTestingKeywords ? (
                                                <>
                                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                    Testing...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="w-4 h-4 mr-2" />
                                                    Test Keywords
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* AI Info Box */}
                                    {extractedConcepts?.length > 0 && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                            <div className="flex gap-2">
                                                <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-green-900 dark:text-green-100">
                                                    <strong>AI Ready:</strong> Detected {extractedConcepts.length} concepts from your PubMed analysis that can be used to generate Scholar keywords.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {testResultCount !== null && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                            <div className="flex gap-2 items-center">
                                                <Search className="w-4 h-4 text-blue-600" />
                                                <div className="text-sm text-blue-900 dark:text-blue-100">
                                                    Found approximately <strong>{testResultCount}</strong> results on Google Scholar
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Browse Results */}
                    {currentStep === 'browse' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-full overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Browse Scholar Results</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {isProcessing ? 'Searching Google Scholar...' : `Found ${scholarArticles.length} articles from Google Scholar`}
                                    </p>
                                </div>
                            </div>

                            {/* Search Metadata */}
                            {!isProcessing && scholarArticles.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {/* Search Results Summary */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                        <div className="flex gap-2 items-center text-sm text-blue-900 dark:text-blue-100">
                                            <Search className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <strong>Search completed:</strong> Retrieved {scholarArticles.length} articles from Google Scholar.
                                                {testResultCount && ` Estimated total: ${testResultCount} results available.`}
                                                {scholarArticles.length === SCHOLAR_BROWSE_MAX && ` (Limited to first ${SCHOLAR_BROWSE_MAX} results)`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duplicate Detection Summary */}
                                    {(() => {
                                        const duplicates = scholarArticles.filter(article => article.isDuplicate);
                                        const unique = scholarArticles.filter(article => !article.isDuplicate);

                                        return (
                                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                                                <div className="flex gap-2 items-center text-sm text-green-900 dark:text-green-100">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <div>
                                                        <strong>Duplicate detection:</strong> Found {unique.length} unique articles and {duplicates.length} potential duplicates of your PubMed results.
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {isProcessing ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400">Searching Google Scholar and identifying duplicates...</p>
                                    </div>
                                </div>
                            ) : searchError ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center max-w-md">
                                        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Search Failed</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{searchError}</p>
                                        <Button
                                            onClick={() => {
                                                setSearchError(null);
                                                setCurrentStep('keywords');
                                            }}
                                            variant="outline"
                                        >
                                            Back to Keywords
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    <div className="space-y-3">
                                        {scholarArticles.map(article => (
                                            <div
                                                key={article.id}
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white flex-1">
                                                            {article.url ? (
                                                                <a
                                                                    href={article.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 hover:underline"
                                                                >
                                                                    {article.title}
                                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                </a>
                                                            ) : (
                                                                article.title
                                                            )}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs flex-shrink-0 ${article.isDuplicate
                                                                ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
                                                                : 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200'
                                                                }`}
                                                        >
                                                            {article.isDuplicate ? 'Duplicate' : 'Unique'}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                        {article.authors?.join(', ')}
                                                    </div>
                                                    {article.isDuplicate && article.duplicateReason && (
                                                        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 rounded px-2 py-1">
                                                            <strong>Duplicate reason:</strong> {article.duplicateReason}
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-xs">
                                                            {article.journal}
                                                        </Badge>
                                                        {article.publication_year && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {article.publication_year}
                                                            </Badge>
                                                        )}
                                                        {article.citation_count !== undefined && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {article.citation_count} citations
                                                            </Badge>
                                                        )}
                                                        {article.similarityScore !== undefined && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {Math.round(article.similarityScore * 100)}% similarity
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Filtering */}
                    {currentStep === 'filtering' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Scholar Results</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Apply the same filter used for your PubMed search, or edit the criteria before filtering.
                                    </p>
                                </div>

                                {/* Article counts information */}
                                {(() => {
                                    const uniqueArticles = scholarArticles.filter(article => !article.isDuplicate);
                                    const duplicateArticles = scholarArticles.filter(article => article.isDuplicate);

                                    return (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                            <div className="space-y-2">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Articles to filter:
                                                </div>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-green-700 dark:text-green-300">
                                                        <strong>{uniqueArticles.length}</strong> unique articles will be filtered
                                                    </span>
                                                    <span className="text-orange-700 dark:text-orange-300">
                                                        <strong>{duplicateArticles.length}</strong> duplicates excluded
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {filterError && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                                        <div className="flex gap-2 items-center text-sm text-red-900 dark:text-red-100">
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                            <div>
                                                <strong>Filter Error:</strong> {filterError}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isFiltering ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="text-center">
                                            <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                                            <p className="text-gray-600 dark:text-gray-400">Filtering Scholar articles...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Filter Criteria:</label>
                                            <Textarea
                                                value={filterCriteria}
                                                onChange={(e) => setFilterCriteria(e.target.value)}
                                                className="min-h-[120px] text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                                placeholder="Enter filter criteria to apply to Scholar results..."
                                            />
                                        </div>

                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                            <div className="flex gap-2">
                                                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-blue-900 dark:text-blue-100">
                                                    <strong>Using PubMed Filter:</strong> The same filter criteria from your original PubMed search will be applied to these Scholar results.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Complete Step */}
                    {currentStep === 'complete' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Filtered Results</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Review the articles that passed filtering and choose whether to add them to your search results.
                                    </p>
                                </div>

                                {/* Filter results summary */}
                                {(() => {
                                    const passedArticles = scholarArticles.filter(article =>
                                        !article.isDuplicate && article.filterStatus?.passed
                                    );
                                    const rejectedArticles = scholarArticles.filter(article =>
                                        !article.isDuplicate && article.filterStatus?.passed === false
                                    );
                                    const duplicates = scholarArticles.filter(article => article.isDuplicate);

                                    return (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                            <div className="text-sm space-y-2">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    Filter Results:
                                                </div>
                                                <div className="flex gap-4 justify-center text-sm">
                                                    <span className="text-green-700 dark:text-green-300">
                                                        <strong>{passedArticles.length}</strong> articles passed filter
                                                    </span>
                                                    <span className="text-red-700 dark:text-red-300">
                                                        <strong>{rejectedArticles.length}</strong> articles filtered out
                                                    </span>
                                                    <span className="text-orange-700 dark:text-orange-300">
                                                        <strong>{duplicates.length}</strong> duplicates excluded
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Articles that passed filtering */}
                                {(() => {
                                    const passedArticles = scholarArticles.filter(article =>
                                        !article.isDuplicate && article.filterStatus?.passed
                                    );

                                    if (passedArticles.length === 0) {
                                        return (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                                                <div className="flex gap-2 items-center text-sm text-yellow-900 dark:text-yellow-100">
                                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                                    <div>
                                                        <strong>No articles passed the filter.</strong> You may want to adjust your filter criteria and try again.
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                Articles that passed filtering ({passedArticles.length}):
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-3">
                                                {passedArticles.map(article => (
                                                    <div
                                                        key={article.id}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                {article.url ? (
                                                                    <a
                                                                        href={article.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 hover:underline"
                                                                    >
                                                                        {article.title}
                                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                    </a>
                                                                ) : (
                                                                    article.title
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                {article.authors?.join(', ')}
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {article.journal}
                                                                </Badge>
                                                                {article.publication_year && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {article.publication_year}
                                                                    </Badge>
                                                                )}
                                                                {article.filterStatus && (
                                                                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                                                                        {Math.round(article.filterStatus.confidence * 100)}% confidence
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {article.filterStatus?.reasoning && (
                                                                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 rounded px-2 py-1">
                                                                    <strong>Filter reasoning:</strong> {article.filterStatus.reasoning}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                </div>

                {/* Action Buttons - Fixed at Bottom */}
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex justify-between">
                        {/* Left side - Back button (conditional) */}
                        <div>
                            {currentStep === 'browse' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep('keywords')}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Keywords
                                </Button>
                            )}
                            {currentStep === 'filtering' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep('browse')}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Browse
                                </Button>
                            )}
                            {currentStep === 'complete' && (
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep('filtering')}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Filter
                                </Button>
                            )}
                        </div>

                        {/* Right side - Primary action buttons */}
                        <div className="flex gap-3">
                            {currentStep === 'keywords' && (
                                <Button
                                    onClick={handleBrowseResults}
                                    disabled={!editedKeywords.trim() || isProcessing}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            Browse Results
                                        </>
                                    )}
                                </Button>
                            )}

                            {currentStep === 'browse' && !isProcessing && (
                                <Button
                                    onClick={() => setCurrentStep('filtering')}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    Continue to Filter
                                </Button>
                            )}

                            {currentStep === 'filtering' && (
                                <Button
                                    onClick={handleFilterScholarResults}
                                    disabled={isFiltering || !filterCriteria.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    {isFiltering ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                            Filtering...
                                        </>
                                    ) : (
                                        'Apply Filter & Add Results'
                                    )}
                                </Button>
                            )}

                            {currentStep === 'complete' && (
                                <>
                                    {(() => {
                                        const passedArticles = scholarArticles.filter(article =>
                                            !article.isDuplicate && article.filterStatus?.passed
                                        );

                                        if (passedArticles.length > 0) {
                                            return (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        onClick={onClose}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            onAddArticles(passedArticles);
                                                            onClose();
                                                        }}
                                                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                                    >
                                                        Add {passedArticles.length} Article{passedArticles.length === 1 ? '' : 's'}
                                                    </Button>
                                                </>
                                            );
                                        } else {
                                            return (
                                                <Button
                                                    onClick={onClose}
                                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                                >
                                                    Close
                                                </Button>
                                            );
                                        }
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}