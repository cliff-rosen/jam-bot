import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSmartSearch2 } from '@/context/SmartSearch2Context';

interface KeywordHelperProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function KeywordHelper({ onComplete, onCancel }: KeywordHelperProps) {
    // UI flow state (local to component)
    const [step, setStep] = useState<'question' | 'evidence' | 'concepts' | 'expressions'>('question');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

    const {
        // Research data from context (persistent)
        selectedSource,
        researchQuestion,
        evidenceSpec,
        extractedConcepts,
        expandedExpressions,
        generatedKeywords,
        conversationHistory,
        completenessScore,
        missingElements,

        // Actions from context
        updateSearchQuery,
        refineEvidenceSpec,
        extractConcepts,
        expandConcepts,
        testKeywordCombination,
        setResearchQuestion,
        setEvidenceSpec,
        setExtractedConcepts,
        setExpandedExpressions,
        setGeneratedKeywords,
        setConversationHistory,
        setCompletenessScore,
        setMissingElements,
        resetResearchJourney,
    } = useSmartSearch2();

    const handleGenerateEvidenceSpec = async () => {
        if (!researchQuestion.trim() && conversationHistory.length === 0) {
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Build conversation context with answers
            const updatedHistory = [...conversationHistory];

            // If we have clarification questions, add the user's answers to conversation history
            if (clarificationQuestions.length > 0) {
                clarificationQuestions.forEach((question, index) => {
                    if (userAnswers[index]) {
                        updatedHistory.push({
                            question,
                            answer: userAnswers[index]
                        });
                    }
                });
                setConversationHistory(updatedHistory);
            }

            // Use conversational refinement
            const response = await refineEvidenceSpec(
                researchQuestion,
                updatedHistory.length > 0 ? updatedHistory : undefined
            );

            setCompletenessScore(response.completeness_score);
            setMissingElements(response.missing_elements || []);

            if (response.is_complete && response.evidence_specification) {
                // Evidence spec is complete
                setEvidenceSpec(response.evidence_specification);
                setClarificationQuestions([]);
                setUserAnswers({});
                setStep('evidence');
            } else if (response.clarification_questions) {
                // Need more information
                setClarificationQuestions(response.clarification_questions);
                setUserAnswers({});
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to refine evidence specification';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExtractConcepts = async () => {
        if (!evidenceSpec.trim()) {
            setError('Evidence specification is required');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await extractConcepts(evidenceSpec);
            setExtractedConcepts(response.concepts);
            setStep('concepts');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to extract concepts';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExpandExpressions = async () => {
        if (extractedConcepts.length === 0) {
            setError('Extracted concepts are required');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await expandConcepts(extractedConcepts, selectedSource);
            // Mark all expressions as selected by default
            const expressionsWithSelection = response.expansions.map(exp => ({ ...exp, selected: true }));
            setExpandedExpressions(expressionsWithSelection);
            setStep('expressions');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to expand expressions';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateKeywords = async () => {
        const selectedExpressions = expandedExpressions.filter(exp => exp.selected);

        if (selectedExpressions.length === 0) {
            setError('Please select at least one expression');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await testKeywordCombination(
                selectedExpressions.map(exp => exp.expression),
                selectedSource
            );

            setGeneratedKeywords(response.combined_query);
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
        { id: 'concepts', title: 'Key Concepts', description: 'Edit and refine concepts' },
        { id: 'expressions', title: 'Boolean Expressions', description: 'Test and accept search query' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);
    const canGoBack = currentStepIndex > 0;

    const goToStep = (stepId: 'question' | 'evidence' | 'concepts' | 'expressions') => {
        setStep(stepId);
        setError(null);
    };

    const handleNext = () => {
        if (step === 'question') {
            handleGenerateEvidenceSpec();
        } else if (step === 'evidence') {
            handleExtractConcepts();
        } else if (step === 'concepts') {
            handleExpandExpressions();
        } else if (step === 'expressions') {
            handleGenerateKeywords();
        }
    };

    const handleBack = () => {
        if (step === 'evidence') {
            setStep('question');
        } else if (step === 'concepts') {
            setStep('evidence');
        } else if (step === 'expressions') {
            setStep('concepts');
        }
        setError(null);
    };

    const handleReset = () => {
        // Reset research data in context
        resetResearchJourney();

        // Reset local UI state
        setClarificationQuestions([]);
        setUserAnswers({});
        setError(null);
        setStep('question');
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
                            <Badge variant="outline" className="mb-3">Step 1 of 4</Badge>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {clarificationQuestions.length > 0 ? 'Answer Clarification Questions' : 'Enter Your Research Question'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {clarificationQuestions.length > 0
                                    ? `Please answer these questions to help refine your search (Completeness: ${Math.round(completenessScore * 100)}%)`
                                    : 'Describe what you\'re looking for in natural language. The AI will analyze your question to create an evidence specification.'}
                            </p>
                        </div>

                        {/* Show initial question input or clarification questions */}
                        {clarificationQuestions.length === 0 ? (
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
                                    disabled={isGenerating}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Be specific about what you want to find - this helps the AI generate better keywords
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Show original question */}
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Your research question:</p>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{researchQuestion}</p>
                                </div>

                                {/* Show clarification questions */}
                                {clarificationQuestions.map((question, index) => (
                                    <div key={index}>
                                        <Label className="text-sm font-medium mb-2 block">
                                            {question}
                                        </Label>
                                        <Textarea
                                            value={userAnswers[index] || ''}
                                            onChange={(e) => setUserAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                                            rows={3}
                                            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                            placeholder="Type your answer here..."
                                            disabled={isGenerating}
                                        />
                                    </div>
                                ))}

                                {/* Show missing elements if any */}
                                {missingElements.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">Missing elements:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {missingElements.map((element, index) => (
                                                <Badge key={index} variant="secondary" className="text-xs">
                                                    {element}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {step === 'evidence' && (
                    <div className="space-y-4">
                        <div>
                            <Badge variant="outline" className="mb-3">Step 2 of 4</Badge>
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

                {step === 'concepts' && (
                    <div className="space-y-4">
                        <div>
                            <Badge variant="outline" className="mb-3">Step 3 of 4</Badge>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Edit Key Concepts
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Review and edit the key concepts. You can modify, add, or remove concepts before expanding them to Boolean expressions.
                            </p>
                        </div>

                        <div>
                            <Label className="text-sm font-medium mb-2 block">
                                Key Concepts
                            </Label>
                            <div className="space-y-2">
                                {extractedConcepts.map((concept, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={concept}
                                            onChange={(e) => {
                                                const newConcepts = [...extractedConcepts];
                                                newConcepts[index] = e.target.value;
                                                setExtractedConcepts(newConcepts);
                                            }}
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                            placeholder="Enter concept..."
                                        />
                                        <button
                                            onClick={() => {
                                                const newConcepts = extractedConcepts.filter((_, i) => i !== index);
                                                setExtractedConcepts(newConcepts);
                                            }}
                                            className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                            title="Remove concept"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        setExtractedConcepts([...extractedConcepts, '']);
                                    }}
                                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                >
                                    + Add Concept
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                These concepts will be expanded into comprehensive Boolean search expressions
                            </p>
                        </div>
                    </div>
                )}

                {step === 'expressions' && (
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
                                Boolean Expressions ({expandedExpressions.filter(exp => exp.selected).length} selected)
                            </Label>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {expandedExpressions.map((expression, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                                        <input
                                            type="checkbox"
                                            id={`expression-${index}`}
                                            checked={expression.selected || false}
                                            onChange={(e) => {
                                                const newExpressions = [...expandedExpressions];
                                                newExpressions[index] = { ...expression, selected: e.target.checked };
                                                setExpandedExpressions(newExpressions);
                                            }}
                                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <label htmlFor={`expression-${index}`} className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 cursor-pointer">
                                                {expression.concept}
                                            </label>
                                            <input
                                                type="text"
                                                value={expression.expression}
                                                onChange={(e) => {
                                                    const newExpressions = [...expandedExpressions];
                                                    newExpressions[index] = { ...expression, expression: e.target.value };
                                                    setExpandedExpressions(newExpressions);
                                                }}
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

                            {/* Test Combination Section */}
                            {expandedExpressions.filter(exp => exp.selected).length > 0 && (
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
                                                value={generatedKeywords || expandedExpressions.filter(exp => exp.selected).map(exp => `(${exp.expression})`).join(' AND ')}
                                                onChange={(e) => setGeneratedKeywords(e.target.value)}
                                                rows={3}
                                                className="text-sm font-mono dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                                placeholder="Combined query will appear here..."
                                            />
                                            {generatedKeywords && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    ✓ Query tested and optimized
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                onClick={async () => {
                                                    const selectedExpressions = expandedExpressions.filter(exp => exp.selected);
                                                    if (selectedExpressions.length > 0) {
                                                        setIsGenerating(true);
                                                        setError(null);
                                                        try {
                                                            const response = await testKeywordCombination(
                                                                selectedExpressions.map(exp => exp.expression),
                                                                selectedSource
                                                            );
                                                            setGeneratedKeywords(response.combined_query);
                                                        } catch (err) {
                                                            const errorMessage = err instanceof Error ? err.message : 'Failed to test combination';
                                                            setError(errorMessage);
                                                        } finally {
                                                            setIsGenerating(false);
                                                        }
                                                    }
                                                }}
                                                disabled={isGenerating || expandedExpressions.filter(exp => exp.selected).length === 0}
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
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                Selected expressions will be combined with AND. Test the combination to see the final search query.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                    {clarificationQuestions.length > 0 && (
                        <Button
                            onClick={handleReset}
                            variant="ghost"
                            disabled={isGenerating}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Start Over
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {step === 'expressions' && generatedKeywords ? (
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
                                Accept & Use Query
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
                            {step !== 'expressions' && (
                                <Button
                                    onClick={handleNext}
                                    disabled={
                                        isGenerating ||
                                        (step === 'question' && !researchQuestion.trim() && clarificationQuestions.length === 0) ||
                                        (step === 'question' && clarificationQuestions.length > 0 && Object.keys(userAnswers).length === 0) ||
                                        (step === 'evidence' && !evidenceSpec.trim()) ||
                                        (step === 'concepts' && extractedConcepts.length === 0)
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
                                                    {clarificationQuestions.length > 0 ? 'Continue Refining' : 'Generate Evidence Spec'}
                                                </>
                                            )}
                                            {step === 'evidence' && (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Extract Concepts
                                                </>
                                            )}
                                            {step === 'concepts' && (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Expand Expressions
                                                </>
                                            )}
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            )}
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