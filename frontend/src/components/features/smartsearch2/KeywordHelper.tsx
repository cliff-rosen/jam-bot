import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, X } from 'lucide-react';
import { useSmartSearch } from '@/context/SmartSearchContext';

interface KeywordHelperProps {
    onComplete: (keywords: string) => void;
    onCancel: () => void;
    selectedSource: 'pubmed' | 'google_scholar';
}

export function KeywordHelper({ onComplete, onCancel, selectedSource }: KeywordHelperProps) {
    const [researchQuestion, setResearchQuestion] = useState('');
    const [generatedKeywords, setGeneratedKeywords] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { generateSearchKeywords, updateOriginalQuestion, updateSubmittedEvidenceSpec } = useSmartSearch();

    const handleGenerateKeywords = async () => {
        if (!researchQuestion.trim()) {
            setError('Please enter a research question');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Set the research question in context
            updateOriginalQuestion(researchQuestion);

            // Generate evidence specification first (this is required for keyword generation)
            // For SmartSearch2, we'll use the research question as a simple evidence spec
            updateSubmittedEvidenceSpec(researchQuestion);

            // Generate search keywords
            const response = await generateSearchKeywords(selectedSource);
            setGeneratedKeywords(response.search_keywords);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate keywords';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseKeywords = () => {
        if (generatedKeywords.trim()) {
            onComplete(generatedKeywords);
        }
    };

    const getPlaceholderText = () => {
        return selectedSource === 'google_scholar'
            ? 'What are the latest developments in machine learning for healthcare diagnosis?'
            : 'What is the relationship between cannabis use and motivation in young adults?';
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    AI Keyword Helper
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Describe your research question and I'll generate optimized search keywords for {selectedSource === 'pubmed' ? 'PubMed' : 'Google Scholar'}.
                </p>
            </div>

            {/* Research Question Input */}
            <div>
                <Label htmlFor="research-question" className="text-base font-semibold mb-2 block">
                    Research Question
                </Label>
                <Textarea
                    id="research-question"
                    value={researchQuestion}
                    onChange={(e) => setResearchQuestion(e.target.value)}
                    rows={4}
                    className="dark:bg-gray-700 dark:text-gray-100"
                    placeholder={getPlaceholderText()}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Describe what you're looking for in natural language
                </p>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
                <Button
                    onClick={handleGenerateKeywords}
                    disabled={!researchQuestion.trim() || isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    {isGenerating ? (
                        <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Generating Keywords...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Keywords
                        </>
                    )}
                </Button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Generated Keywords Display */}
            {generatedKeywords && (
                <div className="space-y-4">
                    <div>
                        <Label className="text-base font-semibold mb-2 block">
                            Generated Keywords
                        </Label>
                        <Textarea
                            value={generatedKeywords}
                            onChange={(e) => setGeneratedKeywords(e.target.value)}
                            rows={6}
                            className="dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
                            placeholder="Generated keywords will appear here..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            You can edit the generated keywords if needed
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUseKeywords}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Use These Keywords
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
