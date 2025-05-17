import React, { useState } from 'react';
import { InformationAsset, StepDetails, WorkflowStep } from './types';

interface InformationAssetPaletteProps {
    steps: WorkflowStep[];
    stepDetails: Record<string, StepDetails>;
    currentStepId: string | null;
}

export const InformationAssetPalette: React.FC<InformationAssetPaletteProps> = ({
    steps,
    stepDetails,
    currentStepId
}) => {
    const [filter, setFilter] = useState<'all' | 'search' | 'generated' | 'analysis' | 'intermediate'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Get all assets from all steps
    const allAssets = Object.values(stepDetails).flatMap(details => details.assets || []);

    // Filter assets based on current filter and search query
    const filteredAssets = allAssets.filter(asset => {
        const matchesFilter = filter === 'all' ||
            (filter === 'search' && asset.type === 'search_result') ||
            (filter === 'generated' && asset.type === 'generated_content') ||
            (filter === 'analysis' && asset.type === 'analysis_output') ||
            (filter === 'intermediate' && asset.type === 'intermediate_finding');

        const matchesSearch = !searchQuery ||
            JSON.stringify(asset.content).toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesFilter && matchesSearch;
    });

    const renderAssetContent = (asset: InformationAsset) => {
        switch (asset.type) {
            case 'search_result':
                return (
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            Search Results
                        </h4>
                        <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto">
                            {JSON.stringify(asset.content, null, 2)}
                        </pre>
                    </div>
                );
            case 'generated_content':
                return (
                    <div className="prose dark:prose-invert max-w-none">
                        {asset.content}
                    </div>
                );
            case 'analysis_output':
                return (
                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            Analysis Results
                        </h4>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {asset.content}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {JSON.stringify(asset.content)}
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Information Assets
                </h3>

                {/* Search and Filter */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as any)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                        <option value="all">All</option>
                        <option value="search">Search Results</option>
                        <option value="generated">Generated</option>
                        <option value="analysis">Analysis</option>
                        <option value="intermediate">Intermediate</option>
                    </select>
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            className={`
                                p-4 rounded-lg border
                                ${asset.stepId === currentStepId
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }
                            `}
                        >
                            {/* Asset Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {/* Asset Type Badge */}
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {asset.type}
                                        </span>
                                        {/* Tool Badge (if present) */}
                                        {asset.metadata.tool && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                                                {asset.metadata.tool}
                                            </span>
                                        )}
                                    </div>
                                    {/* Timestamp */}
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(asset.metadata.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {/* Tags */}
                                <div className="flex flex-wrap gap-1">
                                    {asset.metadata.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Asset Content */}
                            <div className="mt-2">
                                {renderAssetContent(asset)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}; 