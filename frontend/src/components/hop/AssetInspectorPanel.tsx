import React from 'react';
import { Asset, AssetType, CollectionType } from '@/types/asset';
import { getAssetIcon } from '@/lib/utils/assets/assetIconUtils';
import { ClockIcon, TagIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface AssetInspectorPanelProps {
    asset?: Asset;
}

const AssetInspectorPanel: React.FC<AssetInspectorPanelProps> = ({ asset }) => {
    if (!asset) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Select an asset to view details</p>
            </div>
        );
    }

    const renderContent = () => {
        if (asset.is_collection) {
            return (
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Collection Details
                        </h4>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Type: {asset.collection_type}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Items: {Array.isArray(asset.content) ? asset.content.length : 'N/A'}
                            </p>
                        </div>
                    </div>
                    {Array.isArray(asset.content) && (
                        <div className="space-y-2">
                            {asset.content.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                                        {JSON.stringify(item, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        switch (asset.type) {
            case AssetType.FILE:
                return (
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                File Details
                            </h4>
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Type: {asset.subtype}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Size: {typeof asset.content === 'string' ? asset.content.length : 'N/A'} bytes
                                </p>
                            </div>
                        </div>
                        {typeof asset.content === 'string' && (
                            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                                    {asset.content}
                                </pre>
                            </div>
                        )}
                    </div>
                );
            default:
                return (
                    <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                            {JSON.stringify(asset.content, null, 2)}
                        </pre>
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        {getAssetIcon(asset.type, asset.subtype)}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {asset.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {asset.type} {asset.subtype ? `• ${asset.subtype}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Description */}
            {asset.description && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-2">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {asset.description}
                        </p>
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                    {asset.asset_metadata.createdAt && (
                        <div className="flex items-center space-x-2">
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Created: {new Date(asset.asset_metadata.createdAt).toLocaleString()}
                            </span>
                        </div>
                    )}
                    {asset.asset_metadata.tags?.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <TagIcon className="h-5 w-5 text-gray-400" />
                            <div className="flex flex-wrap gap-2">
                                {asset.asset_metadata.tags.map((tag: string) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default AssetInspectorPanel; 