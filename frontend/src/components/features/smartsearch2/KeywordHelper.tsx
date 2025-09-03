import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, X } from 'lucide-react';
import { useSmartSearch2 } from '@/context/SmartSearch2Context';
import { smartSearch2Api } from '@/lib/api/smartSearch2Api';

interface KeywordHelperProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function KeywordHelper({ onComplete, onCancel }: KeywordHelperProps) {
    const [researchQuestion, setResearchQuestion] = useState('');
    const [evidenceSpec, setEvidenceSpec] = useState('');
    const [generatedKeywords, setGeneratedKeywords] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [step, setStep] = useState<'question' | 'evidence' | 'keywords'>('question');
    const [error, setError] = useState<string | null>(null);

    const { selectedSource, updateSearchQuery } = useSmartSearch2();

    const handleGenerateEvidenceSpec = async () => {
        if (!researchQuestion.trim()) {
            setError('Please enter a research question');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Use the same backend logic as main SmartSearch
            const response = await smartSearch2Api.createEvidenceSpecification({
                query: researchQuestion
            });

            setEvidenceSpec(response.evidence_specification);
            setStep('evidence');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate evidence specification';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateKeywords = async () => {
        if (!evidenceSpec.trim()) {
            setError('Evidence specification is required');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Use the same backend logic as main SmartSearch
            const response = await smartSearch2Api.generateKeywords({
                evidence_specification: evidenceSpec,
                source: selectedSource
            });

            setGeneratedKeywords(response.search_keywords);
            setStep('keywords');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate keywords';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseKeywords = () => {
        if (generatedKeywords.trim()) {
            updateSearchQuery(generatedKeywords);
            onComplete();
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
                    Generate optimized search keywords for {selectedSource === 'pubmed' ? 'PubMed' : 'Google Scholar'} using AI-powered analysis.
                </p>
            </div>

            {/* Step 1: Research Question */}
            {step === 'question' && (
                <>
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

                    <div className="flex justify-center">
                        <Button
                            onClick={handleGenerateEvidenceSpec}
                            disabled={!researchQuestion.trim() || isGenerating}
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    Generating Evidence Specification...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Evidence Specification
                                </>
                            )}
                        </Button>
                    </div>
                </>
            )}

            {/* Step 2: Evidence Specification */}
            {step === 'evidence' && (
                <>
                    <div>
                        <Label className="text-base font-semibold mb-2 block">
                            Evidence Specification
                        </Label>
                        <Textarea
                            value={evidenceSpec}
                            onChange={(e) => setEvidenceSpec(e.target.value)}
                            rows={6}
                            className="dark:bg-gray-700 dark:text-gray-100"
                            placeholder="Evidence specification will appear here..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Review and edit the evidence specification if needed
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <Button
                            onClick={handleGenerateKeywords}
                            disabled={!evidenceSpec.trim() || isGenerating}
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
                </>
            )}

            {/* Step 3: Generated Keywords */}
            {step === 'keywords' && (
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

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
}
