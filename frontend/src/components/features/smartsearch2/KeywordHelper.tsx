import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
            const response = await smartSearch2Api.createEvidenceSpec({
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

    const steps = [
        { id: 'question', title: 'Research Question', description: 'Describe what you\'re looking for' },
        { id: 'evidence', title: 'Evidence Specification', description: 'Review the AI-generated specification' },
        { id: 'keywords', title: 'Search Keywords', description: 'Get optimized search terms' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);
    const canGoBack = currentStepIndex > 0;

    const goToStep = (stepId: 'question' | 'evidence' | 'keywords') => {
        setStep(stepId);
        setError(null);
    };

    const handleNext = () => {
        if (step === 'question') {
            handleGenerateEvidenceSpec();
        } else if (step === 'evidence') {
            handleGenerateKeywords();
        }
    };

    const handleBack = () => {
        if (step === 'evidence') {
            setStep('question');
        } else if (step === 'keywords') {
            setStep('evidence');
        }
        setError(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    AI Keyword Helper
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Generate optimized search keywords for {selectedSource === 'pubmed' ? 'PubMed' : 'Google Scholar'} using AI-powered analysis.
                </p>
            </div>

            {/* Step Progress Indicator */}
            <div className="flex items-center justify-between">
                {steps.map((stepItem, index) => (
                    <div key={stepItem.id} className="flex items-center flex-1">
                        <div className="flex items-center">
                            <button
                                onClick={() => goToStep(stepItem.id as any)}
                                disabled={index > currentStepIndex}
                                className={`
                                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                                    ${step === stepItem.id
                                        ? 'bg-blue-600 text-white'
                                        : index < currentStepIndex
                                            ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                {index < currentStepIndex ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    index + 1
                                )}
                            </button>
                            <div className="ml-3 min-w-0 flex-1">
                                <p className={`text-sm font-medium ${step === stepItem.id
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                    {stepItem.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {stepItem.description}
                                </p>
                            </div>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-px mx-4 ${index < currentStepIndex
                                ? 'bg-green-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                {step === 'question' && (
                    <div className="space-y-4">
                        <div>
                            <Badge variant="outline" className="mb-3">Step 1 of 3</Badge>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Enter Your Research Question
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Describe what you're looking for in natural language. The AI will analyze your question to create an evidence specification.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="research-question" className="text-sm font-medium mb-2 block">
                                Research Question
                            </Label>
                            <Textarea
                                id="research-question"
                                value={researchQuestion}
                                onChange={(e) => setResearchQuestion(e.target.value)}
                                rows={4}
                                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                placeholder={getPlaceholderText()}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Be specific about what you want to find - this helps the AI generate better keywords
                            </p>
                        </div>
                    </div>
                )}

                {step === 'evidence' && (
                    <div className="space-y-4">
                        <div>
                            <Badge variant="outline" className="mb-3">Step 2 of 3</Badge>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Review Evidence Specification
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                The AI has created an evidence specification from your research question. Review and edit it if needed before generating keywords.
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 block">
                                Evidence Specification
                            </Label>
                            <Textarea
                                value={evidenceSpec}
                                onChange={(e) => setEvidenceSpec(e.target.value)}
                                rows={6}
                                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                placeholder="Evidence specification will appear here..."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                This specification describes what documents are needed for your research
                            </p>
                        </div>
                    </div>
                )}

                {step === 'keywords' && (
                    <div className="space-y-4">
                        <div>
                            <Badge variant="outline" className="mb-3">Step 3 of 3</Badge>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Generated Search Keywords
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Your optimized search keywords are ready! These are tailored for {selectedSource === 'pubmed' ? 'PubMed' : 'Google Scholar'} and can be edited if needed.
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 block">
                                Search Keywords
                            </Label>
                            <Textarea
                                value={generatedKeywords}
                                onChange={(e) => setGeneratedKeywords(e.target.value)}
                                rows={6}
                                className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 text-sm font-mono"
                                placeholder="Generated keywords will appear here..."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                These keywords are optimized for {selectedSource === 'pubmed' ? 'PubMed boolean search' : 'Google Scholar natural language search'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <div>
                    {canGoBack && (
                        <Button
                            onClick={handleBack}
                            variant="outline"
                            disabled={isGenerating}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {step === 'keywords' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={isGenerating}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUseKeywords}
                                disabled={!generatedKeywords.trim() || isGenerating}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Use These Keywords
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={isGenerating}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleNext}
                                disabled={
                                    isGenerating ||
                                    (step === 'question' && !researchQuestion.trim()) ||
                                    (step === 'evidence' && !evidenceSpec.trim())
                                }
                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        {step === 'question' ? 'Generating...' : 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        {step === 'question' && (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Evidence Spec
                                            </>
                                        )}
                                        {step === 'evidence' && (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Keywords
                                            </>
                                        )}
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
}
