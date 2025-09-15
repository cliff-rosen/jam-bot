import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CoverageTestModal } from './CoverageTestModal';

interface ExpressionsStepProps {
    expandedExpressions: Array<{ concept: string; expression: string; count: number; selected?: boolean }>;
    setExpandedExpressions: (expressions: Array<{ concept: string; expression: string; count: number; selected?: boolean }>) => void;
    generatedKeywords: string;
    setGeneratedKeywords: (keywords: string) => void;
    estimatedResults: number | null;
    setEstimatedResults: (results: number | null) => void;
    isGenerating: boolean;
    selectedSource: 'pubmed' | 'google_scholar';
    testKeywordCombination: (expressions: string[], source: 'pubmed' | 'google_scholar') => Promise<{ combined_query: string; estimated_results: number; source: string; }>;
    setError: (error: string | null) => void;
}

export function ExpressionsStep({
    expandedExpressions,
    setExpandedExpressions,
    generatedKeywords,
    setGeneratedKeywords,
    estimatedResults,
    setEstimatedResults,
    isGenerating,
    selectedSource,
    testKeywordCombination,
    setError
}: ExpressionsStepProps) {
    const [showCoverageModal, setShowCoverageModal] = useState(false);

    const handleExpressionSelectionChange = (index: number, checked: boolean) => {
        const newExpressions = [...expandedExpressions];
        newExpressions[index] = { ...newExpressions[index], selected: checked };
        setExpandedExpressions(newExpressions);
        // Reset generated query and results when selection changes
        setGeneratedKeywords('');
        setEstimatedResults(null);
    };

    const handleExpressionTextChange = (index: number, text: string) => {
        const newExpressions = [...expandedExpressions];
        newExpressions[index] = { ...newExpressions[index], expression: text };
        setExpandedExpressions(newExpressions);
        // Reset generated query and results when expression text changes
        setGeneratedKeywords('');
        setEstimatedResults(null);
    };

    const handleTestCombination = async () => {
        const selectedExpressions = expandedExpressions.filter(exp => exp.selected);
        if (selectedExpressions.length > 0) {
            try {
                console.log('Testing combination:', {
                    selectedCount: selectedExpressions.length,
                    expressions: selectedExpressions.map(exp => exp.expression),
                    source: selectedSource
                });

                const response = await testKeywordCombination(
                    selectedExpressions.map(exp => exp.expression),
                    selectedSource
                );

                console.log('Test response:', response);
                setGeneratedKeywords(response.combined_query);
                setEstimatedResults(response.estimated_results);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to test combination';
                setError(errorMessage);
            }
        }
    };

    const selectedCount = expandedExpressions.filter(exp => exp.selected).length;
    const hasSelectedExpressions = selectedCount > 0;
    const currentCombinedQuery = generatedKeywords ||
        (hasSelectedExpressions ? expandedExpressions.filter(exp => exp.selected).map(exp => `(${exp.expression})`).join(' AND ') : '');

    return (
        <>
            <div className="space-y-4">
                <div>
                    <Badge variant="outline" className="mb-3">Step 4 of 4</Badge>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Test & Accept Search Query
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Select expressions and test their combination. When you find a combination you like, accept it to use for your search.
                    </p>
                </div>

                <div>
                    <Label className="text-sm font-medium mb-3 block">
                        Boolean Expressions ({selectedCount} selected)
                    </Label>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {expandedExpressions.map((expression, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                                <input
                                    type="checkbox"
                                    id={`expression-${index}`}
                                    checked={expression.selected || false}
                                    onChange={(e) => handleExpressionSelectionChange(index, e.target.checked)}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor={`expression-${index}`} className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 cursor-pointer">
                                        {expression.concept}
                                    </label>
                                    <input
                                        type="text"
                                        value={expression.expression}
                                        onChange={(e) => handleExpressionTextChange(index, e.target.value)}
                                        className="w-full text-sm font-mono px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Boolean expression..."
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Estimated results: {expression.count.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Combined Query Section */}
                    {hasSelectedExpressions && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                Combined Search Query
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                        Query {generatedKeywords && '(Tested)'}
                                    </Label>
                                    <Textarea
                                        value={currentCombinedQuery}
                                        onChange={(e) => setGeneratedKeywords(e.target.value)}
                                        rows={3}
                                        className="text-sm font-mono dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                        placeholder="Combined query will appear here..."
                                    />
                                    {generatedKeywords && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            ✓ Query tested and optimized {estimatedResults !== null && `(~${estimatedResults.toLocaleString()} results)`}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={handleTestCombination}
                                        disabled={isGenerating || selectedCount === 0}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="animate-spin mr-2 h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>Test Combination</>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={() => setShowCoverageModal(true)}
                                        disabled={!currentCombinedQuery.trim()}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Test Coverage with Known Articles
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Selected expressions will be combined with AND. Test the combination to see the final search query.
                    </p>
                </div>
            </div>

            {/* Coverage Test Modal */}
            {showCoverageModal && (
                <CoverageTestModal
                    query={currentCombinedQuery}
                    source={selectedSource}
                    onClose={() => setShowCoverageModal(false)}
                />
            )}
        </>
    );
}