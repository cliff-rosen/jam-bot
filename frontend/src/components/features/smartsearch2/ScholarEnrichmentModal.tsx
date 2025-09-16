import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    BookOpen,
    Sparkles,
    Search,
    Plus,
    ChevronRight,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

import type { SmartSearchArticle } from '@/types/smart-search';

interface ScholarEnrichmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentArticles: SmartSearchArticle[];
    onAddArticles: (articles: SmartSearchArticle[]) => void;
}

type EnrichmentStep =
    | 'analyzing'      // Analyzing PubMed results
    | 'keywords'       // Showing generated keywords
    | 'searching'      // Running Scholar search
    | 'deduplicating'  // Finding unique articles
    | 'filtering'      // User filtering Scholar results
    | 'complete';      // Done

export function ScholarEnrichmentModal({
    isOpen,
    onClose,
    currentArticles,
    onAddArticles
}: ScholarEnrichmentModalProps) {
    const [currentStep, setCurrentStep] = useState<EnrichmentStep>('analyzing');
    const [generatedKeywords, setGeneratedKeywords] = useState('');
    const [editedKeywords, setEditedKeywords] = useState('');
    const [scholarArticles, setScholarArticles] = useState<SmartSearchArticle[]>([]);
    const [uniqueArticles, setUniqueArticles] = useState<SmartSearchArticle[]>([]);
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleAnalyze = async () => {
        setIsProcessing(true);
        // Simulate analysis
        setTimeout(() => {
            setGeneratedKeywords('stroke rehabilitation AND (machine learning OR AI OR "artificial intelligence") AND (recovery OR outcome)');
            setEditedKeywords('stroke rehabilitation AND (machine learning OR AI OR "artificial intelligence") AND (recovery OR outcome)');
            setCurrentStep('keywords');
            setIsProcessing(false);
        }, 2000);
    };

    const handleSearch = async () => {
        setIsProcessing(true);
        setCurrentStep('searching');

        // Simulate search
        setTimeout(() => {
            setScholarArticles(mockScholarResults as SmartSearchArticle[]);
            setCurrentStep('deduplicating');

            // Simulate deduplication
            setTimeout(() => {
                setUniqueArticles(mockScholarResults as SmartSearchArticle[]);
                setCurrentStep('filtering');
                setIsProcessing(false);
            }, 1500);
        }, 2000);
    };

    const handleAddSelected = () => {
        const articlesToAdd = uniqueArticles.filter(article =>
            selectedArticles.has(article.id)
        );
        onAddArticles(articlesToAdd);
        setCurrentStep('complete');

        // Auto-close after showing success
        setTimeout(() => {
            onClose();
            // Reset state for next use
            setCurrentStep('analyzing');
            setSelectedArticles(new Set());
        }, 2000);
    };

    const toggleArticleSelection = (articleId: string) => {
        const newSelection = new Set(selectedArticles);
        if (newSelection.has(articleId)) {
            newSelection.delete(articleId);
        } else {
            newSelection.add(articleId);
        }
        setSelectedArticles(newSelection);
    };

    const toggleAllSelection = () => {
        if (selectedArticles.size === uniqueArticles.length) {
            setSelectedArticles(new Set());
        } else {
            setSelectedArticles(new Set(uniqueArticles.map(a => a.id)));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Google Scholar Enrichment
                    </DialogTitle>
                    <DialogDescription>
                        Find additional relevant articles from Google Scholar to supplement your PubMed results
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 py-4">
                    <div className={`flex items-center gap-2 ${currentStep === 'analyzing' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            currentStep === 'analyzing' ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            1
                        </div>
                        <span className="text-sm">Analyze</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <div className={`flex items-center gap-2 ${currentStep === 'keywords' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            currentStep === 'keywords' ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            2
                        </div>
                        <span className="text-sm">Keywords</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <div className={`flex items-center gap-2 ${
                        ['searching', 'deduplicating'].includes(currentStep) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            ['searching', 'deduplicating'].includes(currentStep) ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            3
                        </div>
                        <span className="text-sm">Search</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <div className={`flex items-center gap-2 ${currentStep === 'filtering' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            currentStep === 'filtering' ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            4
                        </div>
                        <span className="text-sm">Filter</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Analyzing */}
                    {currentStep === 'analyzing' && (
                        <div className="space-y-4">
                            <Card className="p-6">
                                <div className="text-center space-y-4">
                                    <Sparkles className="w-12 h-12 mx-auto text-blue-600" />
                                    <h3 className="text-lg font-semibold">Analyze Current Results</h3>
                                    <p className="text-gray-600">
                                        We'll analyze your {currentArticles.length} PubMed articles to generate
                                        optimal search keywords for Google Scholar
                                    </p>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="text-sm text-gray-500 mb-2">Current search contains:</div>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Badge variant="secondary">{currentArticles.length} articles</Badge>
                                            <Badge variant="secondary">
                                                {currentArticles.filter(a => a.filterStatus?.passed !== false).length} accepted
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={isProcessing}
                                        className="w-full max-w-xs mx-auto"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                Analyzing Articles...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Analyze & Generate Keywords
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Step 2: Keywords */}
                    {currentStep === 'keywords' && (
                        <div className="space-y-4">
                            <Card className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Generated Keywords</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Based on your PubMed results, we've generated these search keywords for Google Scholar.
                                            You can edit them before searching.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Search Keywords:</label>
                                        <Textarea
                                            value={editedKeywords}
                                            onChange={(e) => setEditedKeywords(e.target.value)}
                                            className="min-h-[100px] font-mono text-sm"
                                            placeholder="Enter search keywords..."
                                        />
                                        {editedKeywords !== generatedKeywords && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditedKeywords(generatedKeywords)}
                                            >
                                                Reset to original
                                            </Button>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="flex gap-2">
                                            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-blue-900">
                                                <strong>Note:</strong> Google Scholar has different search syntax than PubMed.
                                                Complex boolean queries may be simplified automatically.
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSearch}
                                        disabled={!editedKeywords.trim()}
                                        className="w-full"
                                    >
                                        <Search className="w-4 h-4 mr-2" />
                                        Search Google Scholar
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Step 3: Searching & Deduplicating */}
                    {(currentStep === 'searching' || currentStep === 'deduplicating') && (
                        <div className="space-y-4">
                            <Card className="p-6">
                                <div className="text-center space-y-4">
                                    <div className="relative">
                                        <Search className="w-12 h-12 mx-auto text-blue-600 animate-pulse" />
                                    </div>
                                    <h3 className="text-lg font-semibold">
                                        {currentStep === 'searching' ? 'Searching Google Scholar...' : 'Finding Unique Articles...'}
                                    </h3>
                                    <p className="text-gray-600">
                                        {currentStep === 'searching'
                                            ? 'Retrieving articles from Google Scholar with your keywords'
                                            : `Comparing ${scholarArticles.length} Scholar articles with your PubMed results`
                                        }
                                    </p>
                                    <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: `${currentStep === 'searching' ? 33 : 66}%`,
                                                animation: 'pulse 2s infinite'
                                            }}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Step 4: Filtering */}
                    {currentStep === 'filtering' && (
                        <div className="space-y-4">
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">New Articles from Google Scholar</h3>
                                        <p className="text-sm text-gray-600">
                                            Found {uniqueArticles.length} articles not in your PubMed results
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedArticles.size === uniqueArticles.length && uniqueArticles.length > 0}
                                            onCheckedChange={toggleAllSelection}
                                        />
                                        <label className="text-sm font-medium">Select All</label>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {uniqueArticles.map(article => (
                                        <div
                                            key={article.id}
                                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                                selectedArticles.has(article.id)
                                                    ? 'bg-blue-50 border-blue-300'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => toggleArticleSelection(article.id)}
                                        >
                                            <div className="flex gap-3">
                                                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedArticles.has(article.id)}
                                                        onCheckedChange={() => toggleArticleSelection(article.id)}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="font-medium text-sm">{article.title}</div>
                                                    <div className="text-xs text-gray-600">
                                                        {article.authors?.join(', ')}
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
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
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button
                                        onClick={handleAddSelected}
                                        disabled={selectedArticles.size === 0}
                                        className="flex-1"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add {selectedArticles.size} Selected Article{selectedArticles.size !== 1 ? 's' : ''}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                    >
                                        Skip
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {currentStep === 'complete' && (
                        <div className="space-y-4">
                            <Card className="p-6">
                                <div className="text-center space-y-4">
                                    <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                                    <h3 className="text-lg font-semibold">Articles Added Successfully!</h3>
                                    <p className="text-gray-600">
                                        {selectedArticles.size} new articles from Google Scholar have been added to your results
                                    </p>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}