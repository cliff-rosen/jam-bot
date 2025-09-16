import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
    const [currentStep, setCurrentStep] = useState<EnrichmentStep>('keywords');
    const [editedKeywords, setEditedKeywords] = useState('');
    const [uniqueArticles, setUniqueArticles] = useState<SmartSearchArticle[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
    const [isTestingKeywords, setIsTestingKeywords] = useState(false);
    const [testResultCount, setTestResultCount] = useState<number | null>(null);
    const [filterCriteria, setFilterCriteria] = useState('');

    // Initialize filter criteria from context when modal opens
    React.useEffect(() => {
        if (isOpen) {
            // TODO: Get the evidence spec from SmartSearch2Context and set it here
            setFilterCriteria('Studies examining the effectiveness of interventions in improving patient outcomes, including randomized controlled trials and meta-analyses.');
        }
    }, [isOpen]);

    const handleGenerateKeywords = async () => {
        setIsGeneratingKeywords(true);
        // Simulate AI keyword generation
        setTimeout(() => {
            const keywords = 'stroke rehabilitation AND (machine learning OR AI OR "artificial intelligence") AND (recovery OR outcome)';
            setEditedKeywords(keywords);
            setIsGeneratingKeywords(false);
        }, 2000);
    };

    const handleTestKeywords = async () => {
        if (!editedKeywords.trim()) return;

        setIsTestingKeywords(true);
        // Simulate getting result count
        setTimeout(() => {
            setTestResultCount(Math.floor(Math.random() * 500) + 50); // Random count between 50-550
            setIsTestingKeywords(false);
        }, 1500);
    };

    const handleBrowseResults = async () => {
        setIsProcessing(true);
        setCurrentStep('browse');

        // Simulate search and deduplication
        setTimeout(() => {
            setUniqueArticles(mockScholarResults as SmartSearchArticle[]);
            setIsProcessing(false);
        }, 2000);
    };

    // Mock data for demonstration
    const mockScholarResults = [
        {
            id: 'scholar_001',
            source: 'scholar' as const,
            title: 'Novel approaches in stroke rehabilitation: A systematic review',
            authors: ['Smith, J.', 'Johnson, K.'],
            journal: 'Journal of Rehabilitation Medicine',
            publication_year: 2023,
            abstract: 'This systematic review examines novel approaches...',
            url: 'https://scholar.google.com/...',
            citation_count: 15
        },
        {
            id: 'scholar_002',
            source: 'scholar' as const,
            title: 'Machine learning applications in stroke recovery prediction',
            authors: ['Davis, M.', 'Wilson, R.'],
            journal: 'AI in Medicine',
            publication_year: 2024,
            abstract: 'Recent advances in machine learning have enabled...',
            url: 'https://scholar.google.com/...',
            citation_count: 8
        }
    ];


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col">
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
                                        Enter keywords to search Google Scholar, or use AI to suggest keywords based on your PubMed results.
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

                                    <div className="flex justify-end">
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Browse Results */}
                    {currentStep === 'browse' && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Browse Scholar Results</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Found {uniqueArticles.length} articles from Google Scholar (showing up to 100). Articles marked as duplicates already exist in your PubMed results.
                                        </p>
                                    </div>
                                </div>

                                {isProcessing ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin mx-auto h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400">Searching Google Scholar and identifying duplicates...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                                                            <Badge variant="outline" className="text-xs flex-shrink-0">
                                                                Unique
                                                            </Badge>
                                                        </div>
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            {article.authors?.join(', ')}
                                                        </div>
                                                        <div className="flex gap-2">
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
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep('keywords')}
                                            >
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back to Keywords
                                            </Button>
                                            <Button
                                                onClick={() => setCurrentStep('filtering')}
                                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex-1"
                                            >
                                                Continue to Filter
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
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

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentStep('browse')}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back to Browse
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // Add the filtered articles to PubMed results
                                                onAddArticles(uniqueArticles);
                                                setCurrentStep('complete');
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 flex-1"
                                        >
                                            Apply Filter & Add Results
                                        </Button>
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
                                <Button
                                    onClick={onClose}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}