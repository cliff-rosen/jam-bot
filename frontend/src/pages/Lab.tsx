import React, { useState } from 'react';
import { MODEL_CATEGORIES } from '@/lib/models/types';

export default function LabPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<string>('o4');
    const [prompt, setPrompt] = useState<string>('');
    const [response, setResponse] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);
        try {
            // TODO: Implement API call to LLM service
            const mockResponse = `Response from ${selectedModel}: ${prompt}`;
            setResponse(mockResponse);
        } catch (err) {
            setError('Failed to get response');
            console.error('Error getting response:', err);
        } finally {
            setLoading(false);
        }
    };

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
                            {MODEL_CATEGORIES.best.map((model: string) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </optgroup>
                        <optgroup label="High Performance">
                            {MODEL_CATEGORIES.high_performance.map((model: string) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Fast Models">
                            {MODEL_CATEGORIES.fast.map((model: string) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </optgroup>
                    </select>
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
                                {response}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="text-red-500 mb-4">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}

