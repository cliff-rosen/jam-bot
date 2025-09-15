import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useSmartSearch2 } from '@/context/SmartSearch2Context';

interface CoverageTestModalProps {
    query: string;
    source: 'pubmed' | 'google_scholar';
    onClose: () => void;
}

interface CoverageResult {
    totalArticles: number;
    foundArticles: number;
    foundPmids: string[];
    missingPmids: string[];
    coveragePercentage: number;
}

export function CoverageTestModal({ query, source, onClose }: CoverageTestModalProps) {
    const [targetPmids, setTargetPmids] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [coverageResult, setCoverageResult] = useState<CoverageResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { testCoverage } = useSmartSearch2();

    const handleTestCoverage = async () => {
        if (!targetPmids.trim()) {
            setError('Please enter at least one PMID');
            return;
        }

        // Parse PMIDs from input (comma/space/newline separated)
        const pmids = targetPmids
            .split(/[,\s\n]+/)
            .map(pmid => pmid.trim())
            .filter(pmid => pmid.length > 0)
            .filter(pmid => /^\d+$/.test(pmid)); // Only numeric PMIDs

        if (pmids.length === 0) {
            setError('Please enter valid numeric PMIDs');
            return;
        }

        setIsTesting(true);
        setError(null);
        setCoverageResult(null);

        try {
            // Call the coverage testing through context
            const data = await testCoverage(query, pmids);

            // Transform the response to match our interface
            const foundPmids = data.found_articles?.map((article: any) => article.pmid) || [];
            const missingPmids = pmids.filter(pmid => !foundPmids.includes(pmid));

            setCoverageResult({
                totalArticles: pmids.length,
                foundArticles: foundPmids.length,
                foundPmids,
                missingPmids,
                coveragePercentage: Math.round((foundPmids.length / pmids.length) * 100)
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to test coverage';
            setError(errorMessage);
            console.error('Coverage test failed:', err);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Test Coverage - Search Designer
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {/* Query Display */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Search Query ({source === 'pubmed' ? 'PubMed' : 'Google Scholar'})
                        </Label>
                        <Textarea
                            value={query}
                            readOnly
                            rows={3}
                            className="text-sm font-mono bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        />
                    </div>

                    {/* PMID Input */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Known Target Articles (PMIDs)
                        </Label>
                        <Textarea
                            value={targetPmids}
                            onChange={(e) => setTargetPmids(e.target.value)}
                            rows={4}
                            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                            placeholder="Enter PMIDs separated by commas, spaces, or new lines&#10;Example: 12345678, 23456789, 34567890"
                            disabled={isTesting}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Enter the PMIDs of articles you know should be found by this search
                        </p>
                    </div>

                    {/* Test Button */}
                    <div>
                        <Button
                            onClick={handleTestCoverage}
                            disabled={isTesting || !targetPmids.trim()}
                            className="w-full"
                        >
                            {isTesting ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Testing Coverage...
                                </>
                            ) : (
                                'Test Query Coverage'
                            )}
                        </Button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Results Display */}
                    {coverageResult && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                                Coverage Test Results
                            </h3>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-800 dark:text-blue-200">Coverage:</span>
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        {coverageResult.coveragePercentage}% ({coverageResult.foundArticles}/{coverageResult.totalArticles} articles)
                                    </span>
                                </div>

                                {coverageResult.foundPmids.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                            ✓ Found ({coverageResult.foundPmids.length}):
                                        </p>
                                        <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                                            {coverageResult.foundPmids.join(', ')}
                                        </p>
                                    </div>
                                )}

                                {coverageResult.missingPmids.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                                            ✗ Missing ({coverageResult.missingPmids.length}):
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                                            {coverageResult.missingPmids.join(', ')}
                                        </p>
                                    </div>
                                )}

                                {coverageResult.coveragePercentage < 100 && (
                                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                        💡 Consider adding more search terms or adjusting your Boolean expressions to improve coverage
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}