import React, { useState } from 'react';
import { useModels } from '@/lib/hooks/useModels';
import { invokeLLM } from '@/lib/api/chatApi';
import { ChatMessage, MessageRole } from '@/types/chat';

export default function LabPage() {
    const {
        modelData,
        loading: modelsLoading,
        error: modelsError,
        getModelByCategory,
        getModelConfig,
        getModelFamilyConfig
    } = useModels();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1');
    const [prompt, setPrompt] = useState<string>('');
    const [response, setResponse] = useState<string | null>(null);

    const selectedModelConfig = getModelConfig(selectedModel);
    const modelFamily = selectedModelConfig?.family;
    const familyConfig = modelFamily ? getModelFamilyConfig(modelFamily) : null;

    const handleSubmit = async () => {
        if (!prompt.trim()) return;

        const messages: ChatMessage[] = [
            { role: MessageRole.USER, content: prompt, id: '1234', timestamp: new Date().toISOString() }
        ];

        setLoading(true);
        setError(null);
        try {
            const response = await invokeLLM(messages, selectedModel);
            setResponse(response);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get response from LLM';
            setError(errorMessage);
            console.error('Error getting response:', err);
        } finally {
            setLoading(false);
        }
    };

    if (modelsLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                    <div className="space-y-6">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (modelsError) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="text-red-500">
                    Error loading models: {modelsError.message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Lab</h1>

            <div className="space-y-6">
                {/* Model Selector */}
                <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Model
                    </label>
                    <select
                        id="model"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                        <optgroup label="Best Models">
                            {getModelByCategory('best').map((modelId) => (
                                <option key={modelId} value={modelId}>{modelId}</option>
                            ))}
                        </optgroup>
                        <optgroup label="High Performance">
                            {getModelByCategory('high_performance').map((modelId) => (
                                <option key={modelId} value={modelId}>{modelId}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Fast Models">
                            {getModelByCategory('fast').map((modelId) => (
                                <option key={modelId} value={modelId}>{modelId}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Legacy Models">
                            {getModelByCategory('legacy').map((modelId) => (
                                <option key={modelId} value={modelId}>{modelId}</option>
                            ))}
                        </optgroup>
                    </select>

                    {/* Model Info */}
                    {selectedModelConfig && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{selectedModelConfig.description}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                                <div>
                                    <p><span className="font-medium">Context Window:</span> {selectedModelConfig.context_window.toLocaleString()} tokens</p>
                                    <p><span className="font-medium">Max Output:</span> {selectedModelConfig.max_output.toLocaleString()} tokens</p>
                                    <p><span className="font-medium">Training Data:</span> {selectedModelConfig.training_data}</p>
                                </div>
                                <div>
                                    <p><span className="font-medium">Family:</span> {selectedModelConfig.family}</p>
                                    <p><span className="font-medium">Category:</span> {selectedModelConfig.category}</p>
                                    {selectedModelConfig.aliases && (
                                        <p><span className="font-medium">Aliases:</span> {selectedModelConfig.aliases.join(', ')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Features */}
                            {Object.entries(selectedModelConfig.features).length > 0 && (
                                <div className="mt-2">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">Features:</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {Object.entries(selectedModelConfig.features).map(([feature, enabled]) => (
                                            enabled && (
                                                <span key={feature} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-xs">
                                                    {feature.replace(/_/g, ' ')}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Parameter Support */}
                            {familyConfig && (
                                <div className="mt-2">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">Parameter Support:</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {familyConfig.supported_parameters.map(param => (
                                            <span key={param} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-xs">
                                                {param}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Prompt Input */}
                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prompt
                    </label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your prompt here..."
                    />
                </div>

                {/* Submit Button */}
                <div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !prompt.trim()}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {loading ? 'Processing...' : 'Submit'}
                    </button>
                </div>

                {/* Response Display */}
                {response && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Response</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                                {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mt-6">
                        <h2 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">Error</h2>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <pre className="whitespace-pre-wrap text-sm text-red-800 dark:text-red-200">
                                {error instanceof Error ? error.message : String(error)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

