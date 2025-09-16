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
    ArrowLeft
} from 'lucide-react';

import { useSmartSearch2 } from '@/context/SmartSearch2Context';
import type { SmartSearchArticle } from '@/types/smart-search';

interface ScholarEnrichmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddArticles: (articles: SmartSearchArticle[]) => void;
}

type EnrichmentStep =
    | 'keywords'       // User enters/AI suggests keywords
    | 'browse'         // Browse Scholar results (up to 100)
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
    const [uniqueArticles, setUniqueArticles] = useState<SmartSearchArticle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
    const [isTestingKeywords, setIsTestingKeywords] = useState(false);
    const [testResultCount, setTestResultCount] = useState<number | null>(null);
    const [filterCriteria, setFilterCriteria] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);

    // Initialize filter criteria from context when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setFilterCriteria(evidenceSpec || 'Studies examining the effectiveness of interventions in improving patient outcomes, including randomized controlled trials and meta-analyses.');
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
            const scholarArticles = await searchScholar(editedKeywords, 100);
            setUniqueArticles(scholarArticles);
        } catch (error) {
            console.error('Error browsing Scholar results:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to search Google Scholar';
            setSearchError(errorMessage);
            setUniqueArticles([]);
        } finally {
            setIsProcessing(false);
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            currentStep === 'keywords' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            currentStep === 'browse' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            currentStep === 'filtering' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
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
                                        {isProcessing ? 'Searching Google Scholar...' : `Found ${uniqueArticles.length} unique articles from Google Scholar`}
                                    </p>
                                </div>
                            </div>

                            {/* Search Metadata */}
                            {!isProcessing && uniqueArticles.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {/* Search Results Summary */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                                        <div className="flex gap-2 items-center text-sm text-blue-900 dark:text-blue-100">
                                            <Search className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <strong>Search completed:</strong> Retrieved {uniqueArticles.length} articles from Google Scholar.
                                                {testResultCount && ` Estimated total: ${testResultCount} results available.`}
                                                {uniqueArticles.length === 100 && ' (Limited to first 100 results)'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duplicate Detection Summary */}
                                    {(() => {
                                        const duplicates = uniqueArticles.filter(article => article.isDuplicate);
                                        const unique = uniqueArticles.filter(article => !article.isDuplicate);

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
                                        {uniqueArticles.map(article => (
                                            <div
                                                key={article.id}
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="font-medium text-sm text-gray-900 dark:text-white flex-1">
                                                            {article.title}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs flex-shrink-0 ${
                                                                article.isDuplicate
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
                            </div>
                        </div>
                    )}

                    {/* Complete Step */}
                    {currentStep === 'complete' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="text-center space-y-4">
                                <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scholar Articles Added Successfully!</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    The filtered Google Scholar articles have been added to your PubMed search results.
                                </p>
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
                                    onClick={() => {
                                        // Add the filtered articles to PubMed results
                                        onAddArticles(uniqueArticles);
                                        setCurrentStep('complete');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    Apply Filter & Add Results
                                </Button>
                            )}

                            {currentStep === 'complete' && (
                                <Button
                                    onClick={onClose}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}