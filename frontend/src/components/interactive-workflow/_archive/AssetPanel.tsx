import React, { useState } from 'react';
import { Asset, AssetVersion } from './types';

interface AssetPanelProps {
    assets: Asset[];
    onAssetSelect: (asset: Asset) => void;
    onAssetVersionSelect: (asset: Asset, version: AssetVersion) => void;
    onAssetTagsUpdate: (asset: Asset, tags: string[]) => void;
    className?: string;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({
    assets,
    onAssetSelect,
    onAssetVersionSelect,
    onAssetTagsUpdate,
    className = ''
}) => {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<Asset['type'] | 'all'>('all');
    const [newTag, setNewTag] = useState('');

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'all' || asset.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleAssetSelect = (asset: Asset) => {
        setSelectedAsset(asset);
        onAssetSelect(asset);
    };

    const handleAddTag = (asset: Asset) => {
        if (!newTag.trim()) return;
        const updatedTags = [...asset.metadata.tags, newTag.trim()];
        onAssetTagsUpdate(asset, updatedTags);
        setNewTag('');
    };

    const handleRemoveTag = (asset: Asset, tagToRemove: string) => {
        const updatedTags = asset.metadata.tags.filter(tag => tag !== tagToRemove);
        onAssetTagsUpdate(asset, updatedTags);
    };

    const getAssetIcon = (format: Asset['format']) => {
        switch (format) {
            case 'text':
                return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
            case 'json':
                return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
            case 'pdf':
                return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
            case 'image':
                return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
            default:
                return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
        }
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header with Search and Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search assets..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as Asset['type'] | 'all')}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                        <option value="all">All Types</option>
                        <option value="input">Input</option>
                        <option value="output">Output</option>
                        <option value="intermediate">Intermediate</option>
                    </select>
                </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4 p-4">
                    {filteredAssets.map(asset => (
                        <div
                            key={asset.id}
                            className={`
                                rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                                ${selectedAsset?.id === asset.id
                                    ? 'ring-2 ring-blue-500'
                                    : 'hover:border-blue-500 dark:hover:border-blue-400'
                                }
                            `}
                        >
                            {/* Asset Header */}
                            <div
                                className="p-4 bg-white dark:bg-gray-800 cursor-pointer"
                                onClick={() => handleAssetSelect(asset)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center">
                                        <svg
                                            className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d={getAssetIcon(asset.format)}
                                            />
                                        </svg>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {asset.title}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {asset.type} • {asset.format} • v{asset.version}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(asset.metadata.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Tags */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {asset.metadata.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="group flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700"
                                        >
                                            <span className="text-xs text-gray-600 dark:text-gray-300">
                                                {tag}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveTag(asset, tag);
                                                }}
                                                className="ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                    <div className="flex items-center">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag(asset);
                                                }
                                            }}
                                            placeholder="Add tag..."
                                            className="w-20 px-2 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Version History (shown when selected) */}
                            {selectedAsset?.id === asset.id && (
                                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Version History
                                    </h5>
                                    <div className="space-y-2">
                                        {asset.history.map((version) => (
                                            <button
                                                key={version.version}
                                                className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                                onClick={() => onAssetVersionSelect(asset, version)}
                                            >
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    v{version.version}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                                    {new Date(version.updatedAt).toLocaleString()}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}; 